# Bond — Session Changes (June 22, 2026)

This document covers the features built and bugs fixed in this session.

---

## 1. New User Onboarding Flow

### Plain English

When someone creates a Bond account for the first time, they are now guided through a short 3-step setup before they can use the app. The steps ask about dietary restrictions, cuisines they would never eat, and where they usually eat. This information is saved to their profile and used to personalise every party they create going forward. Returning users who have already completed this flow skip it entirely and go straight to the home screen.

### Engineering

**New route:** `src/routes/onboarding.tsx`

A standalone TanStack Start route at `/onboarding` that is not nested under the `_auth` layout. Its `beforeLoad` guard does two things: redirects to `/welcome` if there is no active session, and redirects to `/home` if the user's `location` field is already set (used as the "onboarding complete" signal — no extra DB column needed).

The component renders three steps managed by a single `step` integer state, animated with `AnimatePresence` from Motion. State for all three fields (`dietary`, `neverCuisines`, `location`) lives in the parent so values are preserved as the user moves between steps. The final step's CTA is disabled until `location` is non-empty, making it the only required field.

**New components:** `src/features/auth/components/OnboardingSteps.tsx`

Three step components — `StepDietaryOnboarding`, `StepNeverCuisines`, `StepLocation` — that reuse the existing `DIETARY` and `CUISINES` constant arrays from `src/features/preferences/components/PreferenceSteps.tsx` and the `LocationInput` component from `src/features/parties/components/LocationInput.tsx`. `StepNeverCuisines` uses `accent-brick` for selected pills to visually distinguish "never eat" from "want to eat."

**New server function:** `src/features/auth/api/updateUserProfile.ts`

Saves `location`, `dietary_restrictions`, and `cuisine_blacklist` to the `users` table in a single update. `cuisine_blacklist` is optional and saved in a separate second call so that a missing database column (pre-migration) cannot block the primary save. Both calls use the service role key via `supabaseServer`, bypassing RLS.

**Auth routing changes:**
- `src/routes/auth/callback.tsx` — after `SIGNED_IN`, queries the user's `location` from the `users` table. If null, redirects to `/onboarding`; otherwise to `/home`. Handles both Google OAuth and email confirmation flows.
- `src/routes/signup.tsx` — email signup success now navigates to `/onboarding` instead of `/home`.

---

## 2. Cuisine Blacklist

### Plain English

During onboarding, users can pick cuisines they would never want suggested. These are saved permanently to their profile. When Bond later searches for restaurants for a party that this user created, those cuisines are filtered out entirely — they will never appear as a recommendation.

### Engineering

**Database migration:** `supabase/schema.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS cuisine_blacklist TEXT[] DEFAULT '{}';
```

This column must be run manually in the Supabase SQL editor. Until it exists, the app silently skips saving the blacklist without blocking onboarding or the profile screen.

**TypeScript types:** `src/types/database.ts`

`cuisine_blacklist: string[] | null` added to the `Row`, `Insert`, and `Update` types for the `users` table.

**Recommendation engine integration:**

`src/features/recommendations/lib/aggregatePreferences.ts` — `aggregatePreferences` now accepts an optional `cuisineBlacklist: string[]` second argument. Blacklisted cuisines are filtered from `rankedCuisines` after the frequency sort, before any restaurant slot is filled.

`src/features/recommendations/api/findRestaurant.ts` — after loading the party, fetches the `creator_id`'s `cuisine_blacklist` from the `users` table using the service role key, then passes it into `aggregatePreferences`. Only the party leader's blacklist is applied at this stage (guests have no profile).

`src/features/preferences/api/getLeaderPrefsContext.ts` — updated to also return `profileCuisineBlacklist` alongside `profileDietaryRestrictions`.

---

## 3. Profile Screen — Dietary Restrictions & Location Editing

### Plain English

The profile screen previously showed dietary restriction pills but they were unresponsive to any existing selections and could be changed accidentally with a single tap. Location was not shown at all. Both issues are now fixed. Dietary restrictions and location each have their own Edit button. Nothing changes until you explicitly click Edit, make your changes, and click Save. Clicking Cancel throws away any changes.

### Engineering

**`src/routes/_auth/profile.tsx`** — complete rewrite of the preferences section.

Each field (dietary restrictions, location) has its own independent set of states:
- `editing*` boolean — whether that section is in edit mode
- `draft*` — a copy of the current value mutated during editing
- `saving*` boolean — loading state for the Save button
- `*Flash` boolean — controls the brief "Saved" aurora text that fades in and out via a `motion.span`

**View mode** renders dietary restrictions as non-interactive `<span>` pills and location as plain text. **Edit mode** for dietary renders the full DIETARY pill grid against `draftRestrictions`; edit mode for location renders `LocationInput` pre-filled with `draftLocation`. Cancel restores nothing (the draft is discarded). Save writes to the database and then promotes the draft to the canonical state.

**Server functions used:**
- Dietary: `updateDietaryRestrictions` (pre-existing)
- Location: new `src/features/auth/api/updateLocation.ts` — a minimal server function that updates only the `location` column

**`src/features/auth/api/getUserProfile.ts`** — simplified to select only `dietary_restrictions` and `location`. A previous version also selected `cuisine_blacklist`, which caused the entire query to fail silently when the column did not yet exist, returning empty values for all fields.

---

## Pending

- **Cuisine blacklist migration** must be run in the Supabase SQL editor before the blacklist field saves from onboarding:
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS cuisine_blacklist TEXT[] DEFAULT '{}';
  ```
- The `users.email` column is populated as an empty string for some accounts. This is a pre-existing bug in the `handle_new_user` trigger and is unrelated to this session's work.
