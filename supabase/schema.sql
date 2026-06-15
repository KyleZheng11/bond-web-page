-- ─────────────────────────────────────────────────────────────────────────────
-- Bond — Database Schema
-- Run this entire file in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── TABLES ──────────────────────────────────────────────────────────────────

-- Users: mirrors auth.users, holds app-level profile data
CREATE TABLE users (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT,
  email                TEXT NOT NULL,
  dietary_restrictions TEXT[]       DEFAULT '{}',
  location             TEXT,
  push_token           TEXT,
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- Parties: one session per "let's pick a restaurant" event
CREATE TABLE parties (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT,
  status       TEXT        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'searching', 'resolved')),
  invite_token UUID        UNIQUE DEFAULT gen_random_uuid(),
  location     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Party members: authenticated users AND guest joiners in the same table.
-- Authenticated users have user_id set; guests have guest_token + phone_number.
CREATE TABLE party_members (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id                 UUID        NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id                  UUID        REFERENCES users(id) ON DELETE SET NULL,
  guest_token              UUID        UNIQUE,
  phone_number             TEXT,
  joined_at                TIMESTAMPTZ DEFAULT NOW(),
  preferences_submitted_at TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ, -- 72 h after creation for guest tokens
  CONSTRAINT member_has_identity CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);

-- Preferences: one row per member per party.
-- RLS on this table is the most critical in the app.
-- A user can only ever read their own row.
-- The recommendation engine reads all rows via the service role key.
CREATE TABLE preferences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id             UUID    NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id              UUID    REFERENCES users(id) ON DELETE CASCADE,
  guest_token          UUID    REFERENCES party_members(guest_token) ON DELETE CASCADE,
  cuisine_preferences  TEXT[]  DEFAULT '{}',
  budget_tier          INTEGER CHECK (budget_tier BETWEEN 1 AND 4),
  vibe                 TEXT,
  dietary_restrictions TEXT[]  DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT preference_has_identity CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);

-- Recommendations: one result per party, produced by the engine.
CREATE TABLE recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id            UUID NOT NULL UNIQUE REFERENCES parties(id) ON DELETE CASCADE,
  restaurant_id       TEXT NOT NULL,
  restaurant_name     TEXT NOT NULL,
  restaurant_data     JSONB NOT NULL DEFAULT '{}',
  reason              TEXT NOT NULL,
  ranked_alternatives JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings: feedback loop for the recommendation model.
CREATE TABLE ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id      UUID    NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  restaurant_id TEXT    NOT NULL,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  visited       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, party_id)
);


-- ─── AUTO-CREATE USER PROFILE ON SIGNUP ──────────────────────────────────────
-- Fires after Supabase creates an auth.users row (Google OAuth or email).
-- Pulls display_name from Google's OAuth metadata when available.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings      ENABLE ROW LEVEL SECURITY;


-- users
CREATE POLICY "users: read own"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users: update own"
  ON users FOR UPDATE USING (auth.uid() = id);


-- parties
CREATE POLICY "parties: creator full access"
  ON parties USING (auth.uid() = creator_id);

CREATE POLICY "parties: members can read"
  ON parties FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_id = parties.id
        AND user_id = auth.uid()
    )
  );


-- party_members
CREATE POLICY "party_members: creator can read all"
  ON party_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parties
      WHERE id = party_members.party_id
        AND creator_id = auth.uid()
    )
  );

CREATE POLICY "party_members: member reads own row"
  ON party_members FOR SELECT USING (user_id = auth.uid());


-- preferences (most critical — never expose cross-user reads)
CREATE POLICY "preferences: read own"
  ON preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "preferences: insert own"
  ON preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences: update own"
  ON preferences FOR UPDATE USING (auth.uid() = user_id);


-- recommendations: visible to party creator + authenticated members
CREATE POLICY "recommendations: party members can read"
  ON recommendations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parties
      WHERE id = recommendations.party_id
        AND creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_id = recommendations.party_id
        AND user_id = auth.uid()
    )
  );


-- ratings
CREATE POLICY "ratings: manage own"
  ON ratings USING (auth.uid() = user_id);


-- ─── REALTIME ─────────────────────────────────────────────────────────────────
-- Enable full replica identity so Realtime can broadcast row-level changes.
-- The lobby subscribes to party_members; the leader's client subscribes to
-- parties.status so it auto-navigates when the result is ready.

ALTER TABLE parties       REPLICA IDENTITY FULL;
ALTER TABLE party_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE party_members;


-- ─── GUEST DATA CLEANUP ───────────────────────────────────────────────────────
-- Adds resolved_at to parties so we know exactly when a party was resolved.
-- A pg_cron job runs hourly and deletes guest preferences rows for parties
-- that resolved more than 24 hours ago, honouring the grace period for guests
-- who open the results link late.
-- party_members rows are intentionally kept (leader sees party history).

ALTER TABLE parties ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- guest_name was added to party_members after initial schema creation
ALTER TABLE party_members ADD COLUMN IF NOT EXISTS guest_name TEXT;

CREATE OR REPLACE FUNCTION cleanup_guest_preferences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM preferences
  WHERE guest_token IS NOT NULL
    AND party_id IN (
      SELECT id FROM parties
      WHERE status = 'resolved'
        AND resolved_at IS NOT NULL
        AND resolved_at < now() - interval '24 hours'
    );
END;
$$;

-- Requires pg_cron extension (enabled by default on Supabase).
-- Run this once in the SQL editor; it persists as a scheduled job.
SELECT cron.schedule(
  'cleanup-guest-prefs',
  '0 * * * *',
  'SELECT cleanup_guest_preferences()'
);


-- ─── FRIENDS ──────────────────────────────────────────────────────────────────

CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- Invite links for connecting with new users via SMS
CREATE TABLE friend_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + interval '7 days'
);

ALTER TABLE friendships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;

-- friendships
CREATE POLICY "friendships: read own"
  ON friendships FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

CREATE POLICY "friendships: insert as requester"
  ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships: addressee can update status"
  ON friendships FOR UPDATE USING (auth.uid() = addressee_id);

-- friend_invites
CREATE POLICY "friend_invites: manage own"
  ON friend_invites USING (auth.uid() = inviter_id);
