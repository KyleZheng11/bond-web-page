# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
```

```Deploying on Cloudflare
pnpm dlx wrangler login - login to cloudflare
pnpm run deploy - deploy website with new build
```

## Documentation

For Tanstack Start documentation, look here: https://tanstack.com/start/latest

For Supabase documentation, look here: https://supabase.com/docs

For Tailwind CSS documentation, look here: https://tailwindcss.com/docs/installation/using-vite

## Guiding Principles

These principles should be kept in mind when building out the application:

- Easy to get started with
- Simple to understand and maintain
- Uses the right tools for the job
- Clean boundaries between different parts of the application
- Secure
- Performant
- Scalable in terms of codebase and team size
- Issues detectable as early as possible

# Bond — CLAUDE.md

This file gives Claude the full context needed to contribute to Bond. Read it before making any changes. Build intentionally, keep things simple, explain your reasoning, and work in small focused steps.

---

## Role

You are a senior software engineer proficient in building web applications using Tanstack Start, Supabase, and Tailwind CSS. You have strong instincts for UI/UX in consumer-facing products.

Build intentionally and keep things as simple as possible. Do not over-engineer unless the task calls for it. Have a teaching mindset — explain why you are building the way you are. Work in small, focused steps so another developer can follow your reasoning at every stage.

Always allow the developer to preview edits before they are written in. Explain each preview edit and why it's being built.

---

## Tech Stack

| Tool               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| **TanStack Start** | Full-stack web framework (routing, SSR, API routes)          |
| **Supabase**       | PostgreSQL database, authentication, real-time subscriptions |
| **Tailwind CSS**   | Utility-first styling                                        |
| **Zod**            | Schema validation on all form inputs and API boundaries      |

---

## Project Overview

**Bond** is a group restaurant decision web app. It solves the problem every friend group knows: nobody can agree on where to eat, and one person ends up doing all the work alone.

### The Core Mechanic

1. A **Party Leader** creates a session and invites friends via phone number (SMS) or from a friends list (authenticated users).
2. Bond sends each friend a unique SMS invite link.
3. **Guest Joiners** tap the link, land directly on the preference form (cuisine, budget, vibe, dietary restrictions), submit their choices, and they're done. No account required.
4. Nobody sees anyone else's input.
5. When the Leader is ready, they trigger the search.
6. Bond's algorithm aggregates preferences and returns **one restaurant recommendation** with a plain-English explanation of why it was chosen.
7. Bond sends a result SMS to every Guest Joiner with the restaurant name and a link to the Results page.

### Site Structure

Bond lives at the same domain as the marketing site — no subdomain split. Marketing pages and app screens share a single TanStack Start router.

---

## User Roles

### Party Leader

- Must have a registered account (Google OAuth or email/password).
- Creates the session, enters friends' phone numbers or adds registered friends, triggers the search.
- Sees the full Results screen and the private Explore screen (ranked alternatives).
- Must complete their own preference input before they can trigger the search.

### Guest Joiner

- Receives an SMS invite link — no account required.
- Identified by their phone number and a session token tied to the invite link.
- Submits preferences through a short form accessed via the link.
- Receives an SMS when the result is ready.
- Their preference data is deleted after the party resolves (temporary by default).
- Can optionally create an account at the end to save their history.

---

## Core Product Principles

These are constraints the product depends on. Check every implementation decision against them.

### 1. Preference input is always private and simultaneous.

No user ever sees another user's preferences — not during input, not after the result. Privacy of preference collection is the mechanism by which honest preferences are captured. Any UI pattern that reveals one member's input to another breaks the product.

### 2. Dietary restrictions are silent.

For Leaders with accounts, dietary restrictions are set once in their profile and applied automatically to every party they create. Guest Joiners set them during the preference form. They are never disclosed to other group members in any UI element.

### 3. The recommendation is one answer, not a list.

Bond returns one primary restaurant recommendation. The Leader can browse ranked alternatives privately, but the group is never asked to deliberate further. The point of the product is to end the decision, not extend it.

### 4. Speed is load-bearing.

A Guest Joiner must be able to go from tapping the SMS link to submitting their preferences in under 90 seconds. No account creation, no redirect walls. The invite link opens directly to the preference form. Any friction on this path risks losing the group member before they participate.

- If the user already has an account, skip the preference form and go straight to the session.
- After the preference form and search, ask the user if they want to create an account.

### 5. The recommendation must explain itself.

The reason a restaurant was chosen must reference the group's actual inputs — cuisine preferences, budget, dietary restrictions, or vibe. Generic copy like "great for groups" is not acceptable.

---

## App Screens

Build in this order. Each screen is a discrete step integrated into the existing project.

| #   | Screen               | Description                                                                                                                                                                                                                                                                          |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Welcome**          | Cold unauthenticated entry point. Bond wordmark, one-line value prop, "Create a party" CTA, "Log in" link. Nothing else.                                                                                                                                                             |
| 2   | **Sign Up**          | Google social login as primary options, email/password as fallback. Social login must be above the fold and visually dominant.                                                                                                                                                       |
| 3   | **Log In**           | Standard returning user login.                                                                                                                                                                                                                                                       |
| 4   | **Invite Landing**   | Entry point for Guest Joiners arriving via SMS link. Shows the Leader's name, member count, and a single CTA: "Add your preferences." No login prompt. If the token is expired or invalid, show a clear human-readable error.                                                        |
| 5   | **Home**             | Authenticated home screen. "Start a new party" CTA and a list of past parties with status (open / searching / resolved). Empty state must be warm and instructional — not a blank void.                                                                                              |
| 6   | **Create Party**     | Party name (optional) and location (browser Geolocation API with manual text fallback). Phone number input to invite friends one at a time. "Add friends" input for authenticated users from a friends list. "Send invites" submits the form and fires Twilio SMS calls server-side. |
| 7   | **Party Lobby**      | Leader's waiting room. Shows the invite link, a real-time member list with ready/not-ready status, and the "Find a restaurant" trigger button. The trigger button is disabled until the Leader completes their own preference input.                                                 |
| 8   | **Preference Input** | Four sequential screens: cuisine (multi-select tiles), budget (four options), vibe (four options, skippable), dietary restrictions (multi-select, skipped if the user has profile-level restrictions saved). Must be completable in under 60 seconds.                                |
| 9   | **Waiting Screen**   | Guest Joiner's end state after submitting. Confirms submission, tells them they'll receive a text when the result is ready. No further action required.                                                                                                                              |
| 10  | **Results Screen**   | Restaurant name, photo, cuisine, price, distance, rating, and the reason Bond picked it. Directions button and share button. Visible to all party members.                                                                                                                           |
| 11  | **Explore Screen**   | Leader-only. Ranked alternatives in three categories: different budget, different cuisine, different vibe. Not visible to joiners.                                                                                                                                                   |
| 12  | **Profile Screen**   | Display name, dietary restrictions (featured setting, with explicit privacy note), past parties, log out.                                                                                                                                                                            |

---

## Supabase Data Model

Six tables. Row Level Security must be enabled on all of them.

### `users`

```
id, display_name, email, dietary_restrictions (array), location, push_token
```

### `parties`

```
id, creator_id, name, status (open | searching | resolved), invite_token, location
```

### `party_members`

```
party_id, user_id, joined_at, preferences_submitted_at
```

### `preferences`

```
party_id, user_id, cuisine_preferences (array), budget_tier (1–4), vibe, dietary_restrictions (array)
```

> ⚠️ RLS on this table is the most critical in the app. A user can only ever read their own row. The recommendation engine reads all rows server-side via a service role key.

### `recommendations`

```
party_id, restaurant_id, restaurant_name, restaurant_data (jsonb), reason, ranked_alternatives (jsonb)
```

### `ratings`

```
user_id, party_id, restaurant_id, rating (1–5), visited (boolean)
```

Feedback loop for the recommendation model.

---

## Key Behaviors

### Real-time lobby updates

Use Supabase Realtime to update the member list in the Party Lobby as Guest Joiners submit their preferences. When the recommendation is ready, the Leader's client navigates to the Results screen automatically via a Realtime event on the `parties` table (`status` changes to `resolved`).

### Guest token flow

When the Leader sends invites, the server generates a unique `guest_token` (UUID) per phone number and stores it in `party_members`. The invite link encodes this token: `/invite/:token`. When a Guest Joiner submits preferences, their token is validated server-side before writing to `preferences`. The token is single-use for writing preferences — subsequent visits to the results link are read-only.

### Dietary restriction merging

When a Leader submits preferences, the server merges their profile-level dietary restrictions with anything they added during the session. The recommendation engine always receives the merged set. Guest Joiners have no profile, so whatever they enter in the preference form is used as-is.

### Invite token expiry

Guest tokens expire 72 hours after creation. After a party resolves, the `/invite/:token` route shows the Results screen rather than allowing new preference submission.

### Guest data cleanup

When a party's status changes to `resolved`, a Supabase Edge Function deletes all `preferences` rows keyed by `guest_token` for that party after a 24-hour grace period (in case the results link is opened late). The `party_members` rows for guests are retained for the Leader's lobby history but contain no PII beyond the phone number.

---

## SMS Strategy (Twilio)

All Twilio calls happen in TanStack Start API routes — never from the client. Do not expose Twilio credentials to the browser under any circumstance.

### Environment variables

```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
```

### Touch points

**1. Invite SMS** — sent when the Leader submits phone numbers.

> "[Leader name] is using Bond to pick a restaurant. Submit your preferences here: [invite link]"

Each phone number gets a unique tokenized link.

**2. Result SMS** — sent to all Guest Joiners when the recommendation is ready.

> "[Leader name]'s group is going to [Restaurant Name]. See the details here: [results link]"

Keep messages short. Link first. Minimum copy.

---

## Styling Guidelines

Use Tailwind CSS throughout. Keep the visual language warm, decisive, and social — Bond is used in high-energy group contexts (group chats, pre-night-out planning). It should not feel like a utility app.

Build website to be formatted for computers and phones.

- Avoid pure white backgrounds and pure black text — use warm off-whites and near-blacks.
- Minimum 44×44pt tap targets on all interactive elements.
- One primary action per screen — the user should never wonder what to do next.
- Haptic feedback on key moments: submitting preferences, the recommendation arriving.
- Loading states must never be blank screens — use skeleton screens or subtle animation.
- Error messages must be human — "Something went wrong, try again" is fine, stack traces are not.

---

## Color Palette

The Bond palette is called **Lanternlight**. The metaphor is warm light against cool night — lit windows in a sleeping town, a fire under a wide sky, friends gathered after dark. Petrol-teal surfaces hold the night; ember, brick, and gold are the fire; aurora is the rare spark of delight. The pairing of cool petrol surfaces with warm earthy accents is the classic cinematic teal/orange complement — it reads as emotional and human, not digital. This is load-bearing for the brand.

Canonical tokens live in the global stylesheet's `@theme inline` block. **Always reference colors via Tailwind tokens** (e.g. `bg-surface-petrol`, `text-cream`) — never with raw hex values in components. A hex literal in a component is a signal the design is drifting from the system.

### Surfaces — the petrol night

| Token              | Hex       | Use for                                                     |
| ------------------ | --------- | ----------------------------------------------------------- |
| `surface-deep`     | `#0B1F2D` | App background, behind everything                           |
| `surface-petrol`   | `#133D5C` | Default surface — cards, list rows, nav bars, sheets        |
| `surface-twilight` | `#1F567A` | Elevated surface — modals, popovers, hover states, dividers |

### Accents — the fire (strict pecking order, loud to rare)

| Token           | Hex       | Role        | Use for                                                                     |
| --------------- | --------- | ----------- | --------------------------------------------------------------------------- |
| `accent-ember`  | `#D45A1F` | Primary     | Main CTAs, active tabs, the "press me" warmth. One dominant use per screen. |
| `accent-brick`  | `#B82E1C` | Live signal | "Happening now," urgency dots, time-sensitive flags. Sparingly.             |
| `accent-gold`   | `#E8A93C` | Highlight   | Stars, "filling fast," icons, subtle emphasis.                              |
| `accent-aurora` | `#3DD4E8` | Rare spark  | Streaks, celebrations, delight moments only. Never a default anything.      |

### Text

| Token        | Hex       | Use for                                                    |
| ------------ | --------- | ---------------------------------------------------------- |
| `text-cream` | `#F0E4CC` | Primary text and icons on dark surfaces                    |
| `text-mist`  | `#8FA8B5` | Secondary — captions, metadata, placeholders, muted labels |

### On-accent text

For text or icons sitting on a colored fill, use the matching `on-*` token — never plain white or black. This keeps the palette cohesive across components.

| Token       | Hex       | Use for                                                        |
| ----------- | --------- | -------------------------------------------------------------- |
| `on-ember`  | `#3A1607` | Text/icons on an ember fill                                    |
| `on-brick`  | `#F0D9C0` | Text/icons on a brick fill (brick is dark — light tone needed) |
| `on-gold`   | `#3A2402` | Text/icons on a gold fill                                      |
| `on-aurora` | `#062D34` | Text/icons on an aurora fill                                   |

### Rules of thumb

- **One dominant accent per screen.** Ember leads. Everything else supports.
- **Ember and brick are close in hue** — don't use them side-by-side as if they were different colors. They read as the same family. Pick one per component.
- **Never place aurora directly against ember.** They're complementary (cyan/orange) and the edges will vibrate at high saturation. Keep a surface color or whitespace between them.
- **Sparkle colors must stay rare.** Gold and aurora should appear in roughly one moment per flow — not on every screen. If they're everywhere, they stop sparkling.
- **No pink, no magenta, no pure white, no pure black.** These break the cinematic warmth and push Bond toward either dating-app or generic SaaS territory.
- **On any colored fill, use the matching `on-*` token for text.** Plain white/black on accents looks off-brand even when it's technically legible.

### Typography (paired with the palette)

- `font-sans` — **Manrope.** Default UI face, applied to `body`. Used for body copy, labels, controls.
- `font-display` — **Fraunces.** Warm serif for headings, hero copy, and personality moments. Its character echoes the lantern-glow vibe — reach for it on the Welcome screen, empty states, the Results headline, and the Profile dietary-restrictions note.

## What Not to Build (MVP)

Do not build any of the following at MVP:

- In-app reservation booking
- Social features (friend lists, ratings feed, reviews within Bond)
- Gamification (badges, streaks, leaderboards)
- In-app messaging between group members
- Activity or travel verticals — restaurants only
- A "suggest a place" feature where members propose alternatives to the group

## File Structure

Build this project file structure to be simple, clean, and scalable. It should be easier to traverse and find your while around the app.
