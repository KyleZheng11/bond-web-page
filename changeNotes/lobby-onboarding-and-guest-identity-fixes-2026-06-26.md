# Bond — Session Changes (June 26, 2026)

All changes in this session relate to the party lobby, user onboarding, and guest identity across the invite flow.

---

## 1. Leader Now Appears in Their Own Crew List

### Plain English

When a leader created a party, they weren't showing up in the crew list — only invited guests appeared. The leader can now see themselves in the list with their display name and a "(You)" tag. Their ready status also updates when they submit preferences.

### Engineering

**Modified:** `src/features/parties/api/createParty.ts`

After inserting the party, the server now fetches the creator's `display_name` and `email` from `public.users` and inserts a `party_members` row for them:

```ts
await supabaseServer.from('party_members').insert({
  party_id: party.id,
  user_id: data.creatorId,
  guest_name: profile?.display_name || profile?.email?.split('@')[0] || 'Host',
  joined_at: new Date().toISOString(),
})
```

**Modified:** `src/features/preferences/api/submitPreferences.ts`

After saving preferences, the leader's `party_members` row is updated so their ready status reflects in the crew list:

```ts
await supabaseServer
  .from('party_members')
  .update({ preferences_submitted_at: new Date().toISOString() })
  .eq('party_id', data.partyId)
  .eq('user_id', data.userId)
```

**Modified:** `src/routes/_auth/party/$partyId/lobby.tsx`

`getPartyLobby` was updated to also return `currentUserDisplayName` fetched directly from the `users` table. The crew list renders this as the name for the leader's row (rather than relying on `party_members.guest_name`), with a `(You)` tag appended:

```tsx
{isYou ? (currentUserDisplayName ?? member.guest_name ?? '—') : (member.guest_name ?? '—')}
{isYou && <span>(You)</span>}
```

---

## 2. Username Step Added to Onboarding

### Plain English

New users are now asked to pick a display name as the very first step after signing up, before the dietary restrictions, cuisine blacklist, and location questions. Previously, Google OAuth users silently inherited their Google name and email signups got their email prefix — neither was ever given the chance to set something intentional.

### Engineering

**New component:** `StepUsername` in `src/features/auth/components/OnboardingSteps.tsx`

A simple text input capped at 40 characters. The "Next" button requires at least 2 characters before it enables.

**Modified:** `src/routes/onboarding.tsx`

Step count increased from 3 to 4. Username is step 0; dietary, never-cuisines, and location shift to steps 1–3. The `username` value is passed through to the final save call.

**Modified:** `src/features/auth/api/updateUserProfile.ts`

`display_name` added to the update payload.

**Modified:** `src/routes/onboarding.tsx` (`beforeLoad`) and `src/routes/auth/callback.tsx`

Both now check for `display_name` in addition to `location` before skipping onboarding. A user must have both set to bypass the flow.

---

## 3. Fix: Guests No Longer Create Duplicate Entries When Returning to the Invite Link

### Plain English

When a guest joined via the general shareable invite link and later returned to that same URL (e.g. from their browser history or a re-shared link), the app had no way to recognise them. It would show the landing page again, and if they re-submitted, a second nameless member row was created. Now returning guests are immediately redirected to their existing lobby slot.

### Engineering

**Modified:** `src/routes/invite/$token/preferences.tsx`

After a first-time submission via the general invite link, the new per-member `guestToken` is saved to `localStorage`:

```ts
if (result.guestToken) {
  localStorage.setItem(`bond:guest:${result.partyId}`, result.guestToken)
}
```

**Modified:** `src/routes/invite/$token/index.tsx`

Before showing the landing page, the app checks `localStorage` for a stored token for this party. If one exists, the user is redirected straight to their member lobby URL:

```ts
const stored = localStorage.getItem(`bond:guest:${result.party.id}`)
if (stored) {
  navigate({ to: '/invite/$token/lobby', params: { token: stored } })
  return
}
```

---

## 4. Guest Lobby Shows the Host's Name

### Plain English

Guests had no way to see who created the party. The guest lobby now shows "Hosted by [name]" beneath the party title, and the host appears by name in the crew list.

### Engineering

**Modified:** `src/features/invites/api/getGuestPartyMembers.ts`

The query now also selects `creator_id` from the party, then fetches the leader's `display_name` and `email` from `public.users`. A `leaderName` field is returned alongside the member list:

```ts
leaderName: leader?.display_name ?? leader?.email?.split('@')[0] ?? 'Your host'
```

**Modified:** `src/routes/invite/$token/lobby.tsx`

`leaderName` is destructured from the data and rendered as a subtitle below the party title.

---

## 5. Fix: Blank Name Shown for Leader in Crew List

### Plain English

If a leader's account had an empty string stored as their email (rather than `null`), the name fallback logic silently produced a blank. `"".split('@')[0]` returns `""`, which does not trigger a `??` fallback. The leader appeared in the crew list as an unnamed box.

### Engineering

**Modified:** `src/features/parties/api/createParty.ts`

Switched from `??` to `||` for the `guest_name` fallback chain so empty strings also fall through to `'Host'`.

**Modified:** `src/routes/_auth/party/$partyId/lobby.tsx`, `src/routes/invite/$token/lobby.tsx`

Member name display updated from `guest_name ?? '—'` to `guest_name || '—'` so an empty string also renders the dash placeholder instead of blank.
