import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useAuth, signOut } from '#/features/auth'

export const Route = createFileRoute('/_auth/profile')({ component: Profile })

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/welcome' })
  }

  const initial = user?.email?.[0].toUpperCase() ?? '?'
  const name = user?.user_metadata.full_name ?? user?.email ?? '—'

  return (
    <div
      className="min-h-screen px-6 py-10 max-w-md mx-auto flex flex-col gap-8"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      {/* Header */}
      <header>
        <Link
          to="/home"
          className="text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Back
        </Link>
      </header>

      {/* Avatar + name */}
      <motion.div
        className="flex flex-col items-center gap-3 py-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
          style={{
            background: 'var(--color-surface-petrol)',
            color: 'var(--color-accent-gold)',
          }}
        >
          {initial}
        </div>
        <p
          className="font-display text-2xl font-bold"
          style={{ color: 'var(--color-text-cream)' }}
        >
          {name}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
          {user?.email}
        </p>
      </motion.div>

      {/* Log out */}
      <div className="mt-auto">
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-70"
          style={{
            background: 'var(--color-surface-petrol)',
            color: 'var(--color-accent-brick)',
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
