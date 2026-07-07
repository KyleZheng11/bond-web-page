import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export const Route = createFileRoute('/_auth/party')({ component: PartyLayout })

/* Every screen in the party flow (new → hub → vote → result → explore)
   slides fully in from the right, no fade — like the next screen already
   exists just off-frame. mode="wait" fully unmounts the outgoing screen
   before the next one mounts: with TanStack Router's <Outlet/> being a
   live subscription to the current match (not a frozen snapshot), letting
   the two overlap meant BOTH the exiting and entering wrappers' Outlets
   rendered the new route simultaneously the instant the URL changed —
   double-mounting the destination screen and double-subscribing its
   realtime channels (the "cannot add postgres_changes callbacks... after
   subscribe()" crash). Sequential exit-then-enter makes that structurally
   impossible. Scoped to this layout only — home/friends/profile are
   unaffected. */
function PartyLayout() {
  const { pathname } = useLocation()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={prefersReducedMotion ? undefined : { x: '-100%' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
