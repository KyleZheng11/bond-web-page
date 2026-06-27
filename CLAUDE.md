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

## Tech Stack

| Tool               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| **TanStack Start** | Full-stack web framework (routing, SSR, API routes)          |
| **Supabase**       | PostgreSQL database, authentication, real-time subscriptions |
| **Tailwind CSS**   | Utility-first styling                                        |
| **Zod**            | Schema validation on all form inputs and API boundaries      |

---

## Project

Bond — a group restaurant decision web app.

## How to work with me

I'm learning this codebase as we build it, so optimize for that:

- Before writing or changing code, briefly say _why_ this approach — not just _what_ you're doing.
- If there's a real tradeoff or alternative, name it in 1–2 sentences. Skip this if the choice is obvious.
- About to add a new dependency, abstraction, or pattern? Ask first.
- Prefer small, reviewable diffs over big rewrites.
- If I ask "why," explain like I haven't seen this part of the code before — I probably haven't.

## Core principles (non-negotiable)

- **KISS** — Use the simplest solution that works. No clever tricks, no extra layers "just in case."
- **YAGNI** — Build what's needed now, not what might be needed later. No speculative config/flags/hooks.
- **DRY** — Don't duplicate logic, but don't over-abstract to dodge it either. Two similar lines is fine; abstract on the third repeat, not the second.

## Code style

- Readability over cleverness or brevity.
- Match existing patterns already in the codebase before introducing new ones.
- No premature optimization — make it work and clear first.

## When unsure

Ask a clarifying question instead of guessing at intent.
