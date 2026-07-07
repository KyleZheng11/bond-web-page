# Bond — Restaurant Search Branch Changes (June 26, 2026)

Source: commit `ff62975` ("feat: guest identity, invite flow fixes, and voting overhaul") on the `restaurant-search` branch. This branch split off before the visual redesign (it still uses the old `lobby.tsx` / `preferences.tsx` / `waiting.tsx` route structure, not the current `hub.tsx`-consolidated flow), so none of this has been merged into `ito-design` or `main` yet. Reproduced here for reference while deciding what to bring over and how to adapt it to the current file structure.

---

# Part 1 — Lobby, Onboarding, and Guest Identity

All changes in this part relate to the party lobby, user onboarding, and guest identity across the invite flow.

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

`getPartyLobby` was updated to also return `currentUserDisplayName` fetched directly from the `users` table. The crew list renders this as the name for the leader's row (rather than relying on `party_members.guest_name`), with a `(You)` tag appended.

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

The query now also selects `creator_id` from the party, then fetches the leader's `display_name` and `email` from `public.users`. A `leaderName` field is returned alongside the member list.

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

---

# Part 2 — Voting Flow and Restaurant Search

All changes in this part relate to the restaurant search, voting flow, and results experience.

## 1. Rebuilt Restaurant Search Strategy

### Plain English

When the leader clicks "Find a Restaurant," the search now only looks for restaurants that match the group's top cuisine preference and budget. If it can't find enough options (target is 4 candidates), it tries the runner-up cuisine. Previously the search was pulling restaurants more broadly without strong preference signal driving it.

### Engineering

**Modified:** `src/features/recommendations/api/findRestaurant.ts`

Replaced the old 4-slot strategy with a `fill(cuisineLabel)` helper function. `fill` calls `searchNearbyRestaurants` once per cuisine type and scores results using `rating × log(min(reviewCount, 800) + 1)` to cap the advantage high-volume chains have over well-rated local spots. It deduplicates by both place ID and normalized name to prevent the same restaurant appearing twice under slightly different names.

```ts
const TARGET = 4
await fill(searchCuisines[0] ?? null)
if (candidates.length < TARGET && searchCuisines[1]) await fill(searchCuisines[1])
```

---

## 2. Dietary Restriction Filtering in Restaurant Search

### Plain English

If any group member has dietary restrictions, the restaurant search now accounts for them. Vegan and vegetarian restrictions use a hard filter — only restaurants Google marks as serving vegetarian food are included. For other restrictions (gluten-free, halal, kosher, dairy-free), the search restricts the cuisine types it looks at to ones statistically known to accommodate those needs, since Google Places has no field for them.

### Engineering

**Modified:** `src/features/recommendations/api/findRestaurant.ts`
**Modified:** `src/features/recommendations/lib/googlePlaces.ts`
**Modified:** `src/features/recommendations/lib/aggregatePreferences.ts`

`aggregatePreferences` now returns `needsVegan`, `needsVegetarian`, and `dietaryCuisines` (a ranked list of cuisine types compatible with the group's restrictions, from a `DIETARY_FRIENDLY` map). In `findRestaurant`, the vegetarian filter is applied inline in the `fill` helper:

```ts
(!needsVegetarianFilter || p.servesVegetarianFood)
```

For non-veg restrictions, `searchCuisines` is derived from the intersection of the group's preferred cuisines and the dietary-friendly set. `googlePlaces.ts` had `servesVegetarianFood: boolean` added to the `Place` interface and to the field mask sent to the API.

---

## 3. All Lobby Members Redirected to Vote Screen

### Plain English

Previously, only the leader saw the vote screen when they clicked "Find a Restaurant." Invited guests stayed on the lobby screen and had no way to vote. Now all guests are automatically redirected to the voting screen at the same moment the leader triggers the search.

### Engineering

**Modified:** `src/routes/_auth/party/$partyId/lobby.tsx`
**Modified:** `src/routes/invite/$token/lobby.tsx`

After `findRestaurant` resolves, the leader's browser sends a `voting_started` broadcast on the `lobby:{partyId}` channel before navigating itself. Both lobby screens (authenticated and guest) subscribe to this broadcast and navigate to their respective vote routes when it arrives.

The `postgres_changes` handler on the guest lobby was also updated to navigate when `status === 'voting'` as a secondary signal.

---

## 4. All Party Members Redirected to Results

### Plain English

After the leader locks in the result, all guests are automatically taken to the results page without having to refresh or tap anything.

### Engineering

**Modified:** `src/features/votes/api/finalizeVoting.ts`
**Modified:** `src/routes/_auth/party/$partyId/vote.tsx`
**Modified:** `src/routes/invite/$token/vote.tsx`

`finalizeVoting` broadcasts a `result_locked` event on the `vote:{partyId}` channel server-side after updating the party status. Both vote screens listen for this event. As a guaranteed fallback (since broadcast delivery for unauthenticated users is unreliable), both vote screens also poll `getRecommendation` every 3 seconds after the user votes and navigate as soon as the result is no longer `'pending'`.

---

## 5. Fix: Guest Votes Were Overwriting Each Other

### Plain English

In testing with multiple invited guests, the leader's choice kept winning even when two guests voted for the same different option. The cause: all guests shared the same voter ID (the party-level invite token), so each new guest vote overwrote the previous one in the database.

### Engineering

**Modified:** `src/routes/invite/$token/preferences.tsx`

After `submitGuestPreferences` returns, the response includes a per-member `guestToken` (a unique UUID generated when the member row is created). The navigation after preference submission was updated to use this token rather than the original invite token, so each guest carries their own unique identity in the URL through the lobby and vote screens, and their vote is stored under their unique token as the voter ID.

---

## 6. Fix: Leader Not Counted in Total Voters

### Plain English

The "X of Y voted" counter was showing the wrong total because the party leader wasn't being included in the voter count. This was causing the progress bar and `allVoted` logic to be off by one.

### Engineering

**Modified:** `src/features/votes/api/getCandidates.ts`

The leader is the party creator and does not have a row in `party_members`. The fix queries the `preferences` table for a row matching the creator's `user_id` and adds 1 to the count if found:

```ts
const { data: leaderPref } = await supabaseServer
  .from('preferences').select('id')
  .eq('party_id', data.partyId).eq('user_id', party?.creator_id ?? '').maybeSingle()

const totalVoters = (memberCount ?? 0) + (leaderPref ? 1 : 0)
```

---

## 7. New: Guest-Accessible Results Page

### Plain English

Guests were hitting an authentication wall when navigating to the results page because the existing results route requires a login. A separate results route for guests was created that shows the same information without requiring an account.

### Engineering

**New file:** `src/routes/invite/$token/results.tsx`

Unauthenticated route that calls `resolveInvite` to get `partyId` from the token, then calls `getRecommendation` to fetch the result. Displays the same restaurant details as the authenticated results page.

**Modified:** `src/routes/invite/$token/index.tsx`, `src/routes/invite/$token/vote.tsx`, `src/routes/invite/$token/waiting.tsx`

All guest-side navigation that previously pointed to `/party/$partyId/results` was updated to point to `/invite/$token/results`.

---

## 8. Removed Live Vote Results During Voting

### Plain English

Vote counts and percentage bars no longer appear on candidate cards while voting is in progress. This stops people from voting based on what's already winning rather than their own genuine preference.

### Engineering

**Modified:** `src/routes/_auth/party/$partyId/vote.tsx`
**Modified:** `src/routes/invite/$token/vote.tsx`

Removed `voteCount`, `totalVotes`, and `revealed` props from the `CandidateCard` component on the auth vote screen, along with the vote bar JSX block that was conditionally rendered after the user voted. Removed the equivalent inline `{myVote && (...)}` vote bar block from the guest vote screen. The `votesCast` and `totalVoters` state was retained on the auth screen (used for the progress bar and `allVoted` logic) but the `voteCounts` state was removed from both screens as it was no longer rendered anywhere.

---

## 9. Fix: Budget Filter Not Being Applied

### Plain English

Despite everyone picking a cheap budget, the restaurant search was returning expensive options. The cause: Google's Nearby Search API silently ignores the `priceLevels` field in the request body — that filter only works on the Text Search endpoint.

### Engineering

**Modified:** `src/features/recommendations/api/findRestaurant.ts`

Added a client-side price filter inside `fill` that checks each result against the group's allowed price levels after the API response comes back:

```ts
(priceSet.size === 0 || p.priceLevel === 'PRICE_LEVEL_UNSPECIFIED' || priceSet.has(p.priceLevel))
```

Places with `PRICE_LEVEL_UNSPECIFIED` always pass through (no price data means unknown, not expensive).

A progressive budget-relaxation fallback was added: if not enough candidates are found at the group's exact budget tier, the search expands one tier at a time rather than returning an error or jumping straight to no filter. This handles the practical reality that Google labels many affordable restaurants as `PRICE_LEVEL_MODERATE` rather than `PRICE_LEVEL_INEXPENSIVE`.

---

## 10. Voting Progress Bar for the Leader

### Plain English

The leader's vote screen now shows a progress bar below the "Lock in result" button. It fills up as guests vote and turns gold when everyone has voted. It updates every 2 seconds via server polling, so it stays accurate regardless of real-time broadcast reliability.

### Engineering

**Modified:** `src/routes/_auth/party/$partyId/vote.tsx`

Added a polling `useEffect` that calls `load()` every 2 seconds from the moment the leader lands on the screen (independent of whether they've voted yet). Below the lock-in button, a progress bar was added that fills proportionally to `votesCast / totalVoters`. The fill color transitions from ember to gold when `allVoted` is true. The label below the bar doubles as the "you can lock in early" hint, replacing the previous standalone text line.
