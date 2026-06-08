import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/welcome')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/home' })
  },
  component: Welcome,
})

function Welcome() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      {/* Wordmark — tapping it returns to the marketing page */}
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Link to="/" className="transition-opacity hover:opacity-70">
          <span
            className="text-4xl font-black tracking-tight"
            style={{ color: 'var(--color-accent-gold)' }}
          >
            Bond
          </span>
        </Link>
      </motion.div>
      {/* Value prop */}
      <motion.p
        className="text-lg text-center max-w-xs mb-12"
        style={{ color: 'var(--color-text-mist)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      >
        One restaurant. No debate. Just go.
      </motion.p>
      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
        className="flex flex-col items-center gap-4 w-full max-w-xs"
      >
        <Link
          to="/signup"
          className="w-full text-center font-bold py-4 rounded-2xl text-base transition-opacity hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--color-accent-ember)',
            color: 'var(--color-on-ember)',
          }}
        >
          Create a party
        </Link>

        {/* Secondary — Log in */}
        <Link
          to="/login"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          Log in
        </Link>
      </motion.div>
    </div>
  )
}
