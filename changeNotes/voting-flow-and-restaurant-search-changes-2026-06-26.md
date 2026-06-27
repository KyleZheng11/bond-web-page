# Bond — Session Changes (June 26, 2026)

All changes in this session relate to the restaurant search, voting flow, and results experience.

---

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

After `submitGuestPreferences` returns, the response includes a per-member `guestToken` (a unique UUID generated when the member row is created). The navigation after preference submission was updated to use this token rather than the original invite token:

```ts
const nextToken = result.guestToken ?? token
navigate({ to: '/invite/$token/lobby', params: { token: nextToken } })
```

This means each guest carries their own unique identity in the URL through the lobby and vote screens. Their vote is stored with their unique token as the voter ID, so votes no longer overwrite each other.

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

A progressive budget-relaxation fallback was added: if not enough candidates are found at the group's exact budget tier, the search expands one tier at a time rather than returning an error or jumping straight to no filter:

```ts
let relaxedTier = signal.commonBudget + 1
while (candidates.length < TARGET && relaxedTier <= 4) {
  const relaxedLevels = new Set(tiersToGooglePriceLevels(relaxedTier))
  await fill(searchCuisines[0] ?? null, relaxedLevels)
  if (candidates.length < TARGET && searchCuisines[1]) {
    await fill(searchCuisines[1], relaxedLevels)
  }
  relaxedTier++
}
```

This handles the practical reality that Google labels many affordable restaurants as `PRICE_LEVEL_MODERATE` rather than `PRICE_LEVEL_INEXPENSIVE`.

---

## 10. Voting Progress Bar for the Leader

### Plain English

The leader's vote screen now shows a progress bar below the "Lock in result" button. It fills up as guests vote and turns gold when everyone has voted. It updates every 2 seconds via server polling, so it stays accurate regardless of real-time broadcast reliability.

### Engineering

**Modified:** `src/routes/_auth/party/$partyId/vote.tsx`

Added a polling `useEffect` that calls `load()` every 2 seconds from the moment the leader lands on the screen (independent of whether they've voted yet):

```ts
useEffect(() => {
  const interval = setInterval(load, 2000)
  return () => clearInterval(interval)
}, [load])
```

Below the lock-in button, a progress bar was added that fills proportionally to `votesCast / totalVoters`. The fill color transitions from ember to gold when `allVoted` is true. The label below the bar doubles as the "you can lock in early" hint, replacing the previous standalone text line.
