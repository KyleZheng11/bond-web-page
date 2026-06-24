# Bond — Session Changes Part 2 (June 22, 2026)

Changes made after the initial onboarding/profile session. All three features relate to the party creation and invite flow.

---

## 1. Auto-fill Location on Create Party

### Plain English

When a user goes to create a new party, the location field now automatically fills in with the default location they set during onboarding. They can still change it for any individual party — it's just a starting point so they don't have to type it every time.

### Engineering

**Modified:** `src/routes/_auth/party/new.tsx`

`getUserProfile` is now imported and called inside the existing `useEffect` that runs on mount. If the profile has a `location` set, it calls `setLocation` with that value before the user sees the form. The `LocationInput` component remains fully editable, so the pre-filled value can be overridden per party.

---

## 2. Party Creator Goes Directly to Preferences

### Plain English

Previously, after creating a party the leader was taken to the party lobby screen. Now they go straight to the preference input screen instead. This means the leader fills out their own preferences immediately after creating the party, rather than having to navigate there manually.

### Engineering

**Modified:** `src/routes/_auth/party/new.tsx`

One-line change. The `navigate` call after a successful `createParty` was updated from:

```ts
navigate({ to: '/party/$partyId/lobby', params: { partyId: party.id } })
```

to:

```ts
navigate({ to: '/party/$partyId/preferences', params: { partyId: party.id } })
```

Once the leader submits their preferences, the existing preferences flow navigates them to the lobby as normal.

---

## 3. Guest Lobby After Submitting Preferences

### Plain English

Before this change, after an invited guest submitted their preferences they landed on a static "waiting" screen that just told them to wait for a text. Now they land on a live party screen where they can see who else is in the group, who has submitted their preferences, and share the invite link with others. The screen updates in real time as other members join and submit. They cannot trigger the restaurant search — that stays with the party leader. If the leader resolves the party, the guest is automatically taken to the results page.

### Engineering

**New server function:** `src/features/invites/api/getGuestPartyMembers.ts`

Takes the guest's invite `token`, resolves it to a `party_members` row, then fetches the full `parties` row (including `invite_token` for sharing) and all `party_members` for that party. Uses the service role key so no user session is required. Exported via `src/features/invites/index.ts`.

**New route:** `src/routes/invite/$token/lobby.tsx`

A standalone unauthenticated route. On mount, calls `getGuestPartyMembers` to load the party and member list. Subscribes to two Supabase Realtime signals on the `lobby:{partyId}` channel:

- **Broadcast `member_updated`** — fired by each guest's browser after submitting preferences. The guest lobby listens for this and reloads the member list so the ready/waiting status stays current.
- **Postgres `UPDATE` on `parties`** — if the party status changes to `resolved`, the guest is navigated back to `/invite/$token` which then redirects them to the results page.

The UI shows:
- A "You're in" confirmation banner
- An invite section with a copy-link button and an SMS deep link (`sms:&body=...`) so guests can bring in more people
- A live member list showing each person's name and ready/waiting status

No "Find a restaurant" button is present — that control exists only in the authenticated leader lobby.

**Modified:** `src/routes/invite/$token/preferences.tsx`

After submitting preferences and broadcasting the `member_updated` event, navigation was changed from `/invite/$token/waiting` to `/invite/$token/lobby`.

**Modified:** `src/routes/invite/$token/index.tsx`

The `alreadySubmitted` state previously showed a static dead-end message. It now immediately redirects to `/invite/$token/lobby` so returning guests can always access the live party screen.

---

# Bond — Session Changes Part 3 (June 23, 2026)

Follow-up fixes and features building on the guest lobby and invite flow.

---

## 4. Fix: Guest Lobby Crashing for General Invite Link Users

### Plain English

When a guest joined via the party's general share link (copied from the leader's lobby) rather than a personal SMS invite, the guest lobby crashed with "Something went wrong." after they submitted their preferences.

### Engineering

**Modified:** `src/features/invites/api/getGuestPartyMembers.ts`

The function was only querying `party_members` by `guest_token`. When the URL token was the party-level `invite_token` (stored on `parties`), no row was found and the function threw. Added the same dual-lookup pattern already used in `resolveInvite` and `submitGuestPreferences`: first try `party_members.guest_token`, then fall back to `parties.invite_token`. The rest of the function then uses the resolved `partyId`.

---

## 5. "Save Your Preferences" Account Creation Nudge in Guest Lobby

### Plain English

After guests submit their preferences and land in the lobby, they now see a "Save Your Preferences" button at the bottom of the screen. Tapping it takes them to the signup page so they can create an account and have Bond remember their tastes for next time. The CTA is framed around personal benefit (saving preferences) rather than product discovery.

### Engineering

**Modified:** `src/routes/invite/$token/lobby.tsx`

Added a `Link` to `/signup` at the bottom of the main content, below the member list. Styled as a full-width ember-coloured button. For already-authenticated users (e.g. the leader testing the flow), the signup route's `beforeLoad` guard redirects to `/home`.

---

## 6. Native Share Sheet Replaces "Send via SMS"

### Plain English

The "Send via SMS" button on all lobby and friends screens now uses the browser's native Web Share API instead of an `sms:` deep link. On iPhone and Android this opens the system share sheet, giving the user every installed app as a share target (Messages, WhatsApp, Instagram DMs, etc.). On desktop browsers that don't support the Share API, it falls back to the old SMS link behaviour.

### Engineering

**Modified:** `src/routes/invite/$token/lobby.tsx`, `src/routes/_auth/party/$partyId/lobby.tsx`, `src/routes/_auth/friends.tsx`

In each file, the `<a href="sms:...">` tag was replaced with a `<button>`. A `shareLink` / `shareInviteLink` function was added alongside the existing `copyLink` function. The function calls `navigator.share({ title, text, url })` if the API is available, and falls back to `window.open('sms:...')` otherwise. Button label changed from "Send via SMS" to "Share".

---

## 7. Change Preferences from Lobby

### Plain English

Both the party leader and invited guests can now edit their preferences after submitting them, directly from the lobby screen. A small "Change" link appears inline in the preferences status card. Tapping it takes the user back through the preference steps; submitting overwrites their previous answers.

### Engineering

**Modified:** `src/features/invites/api/submitGuestPreferences.ts`

Removed the hard throw on re-submission (`Preferences already submitted.`). Now checks whether a preferences row already exists for the guest token: if yes, it does an `UPDATE`; if no, it does an `INSERT`. Also guards against overwriting a saved guest name with an empty string when the user edits from the lobby (where no name is passed in the URL).

**Modified:** `src/routes/invite/$token/lobby.tsx`

Added a "Change" `Link` inline in the "You're in" confirmation banner, pointing to `/invite/$token/preferences` with `search={{ name: '' }}` (the name field is already saved in the DB; the server skips overwriting it when empty).

**Modified:** `src/routes/_auth/party/$partyId/lobby.tsx`

Added a "Change" `Link` in the "Your preferences" card for both the creator view and the authenticated member view, pointing to `/party/$partyId/preferences`. The leader's `submitPreferences` server function already used `upsert`, so no server change was needed.

---

## 8. Streamlined Leader Preference Flow (Cuisine + Budget Only)

### Plain English

When the party creator fills out their preferences, Bond no longer asks them about dietary restrictions or vibe. Dietary restrictions are already saved on their profile and applied automatically server-side. The cuisine step also filters out any cuisines they have blacklisted in their profile, so those options never appear. The flow is now two steps: cuisine → budget.

### Engineering

**Modified:** `src/routes/_auth/party/$partyId/preferences.tsx`

- Removed the `showDietaryStep` state and the conditional that toggled it based on profile dietary restrictions. `totalSteps` is now always `2`.
- `getLeaderPrefsContext` is still called on mount, but now only to retrieve `profileCuisineBlacklist`. The result is stored in a `cuisineBlacklist` state variable and passed down to `StepCuisine`.
- The dietary state and `toggleDietary` function were removed. `submitPreferences` is called with `dietaryRestrictions: []` — the server merges the user's profile restrictions anyway.
- `StepDietary` import removed.

**Modified:** `src/features/preferences/components/PreferenceSteps.tsx`

`StepCuisine` now accepts an optional `blacklist` prop (defaults to `[]`). Before rendering, the full `CUISINES` list is filtered to exclude any entry present in the blacklist. The guest preference flow passes no blacklist, so it remains unaffected.
