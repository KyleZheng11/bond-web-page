import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { getAuthState } from '#/features/auth'
import { Wordmark } from '#/components/ui'

export const Route = createFileRoute('/welcome')({
  beforeLoad: async () => {
    if (await getAuthState()) throw redirect({ to: '/home' })
  },
  component: Welcome,
})

function Welcome() {
  return (
    <div className="dawn-sky min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="dawn-sun dawn-sun-rise" aria-hidden />
      <div className="dawn-horizon" aria-hidden />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs text-center">
        {/* Wordmark — tapping it returns to the marketing page */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Link to="/" className="transition-opacity hover:opacity-80">
            <Wordmark dark className="text-5xl text-on-dawn" />
          </Link>
        </motion.div>

        <motion.p
          className="text-lg mt-5 mb-12 text-on-dawn"
          style={{ color: 'var(--color-on-deep)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        >
          One restaurant. No debate. Just go.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
        >
          <Link to="/signup" search={{ returnTo: undefined }} className="btn btn-primary w-full py-4 text-base">
            Create a party
          </Link>
          <Link
            to="/login"
            search={{ returnTo: undefined }}
            className="text-sm font-semibold py-2 transition-opacity hover:opacity-80 text-on-dawn"
            style={{ color: 'var(--color-on-deep)' }}
          >
            Log in
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
