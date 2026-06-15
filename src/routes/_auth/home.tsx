import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useAuth } from '#/features/auth'
import { useParties, PartyCard } from '#/features/parties'

export const Route = createFileRoute('/_auth/home')({ component: Home })

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning.'
  if (h < 17) return 'Good afternoon.'
  if (h < 21) return 'Good evening.'
  return 'Got Plans?'
}

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { parties, loading, error } = useParties(user?.id)

  return (
    <div
      className="min-h-screen px-6 py-10 max-w-md mx-auto flex flex-col gap-10"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-black transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-accent-gold)' }}
        >
          Bond
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/friends"
            className="text-sm font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
          >
            Friends
          </Link>
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-surface-petrol)',
              color: 'var(--color-text-cream)',
            }}
          >
            {user?.email?.[0].toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      {/* Greeting + CTA */}
      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1
          className="font-display text-4xl font-bold leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          {greeting()}
        </h1>
        <motion.button
          onClick={() => navigate({ to: '/party/new' })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl font-bold text-base"
          style={{
            background: 'var(--color-accent-ember)',
            color: 'var(--color-on-ember)',
          }}
        >
          Start a new party
        </motion.button>
      </motion.div>

      {/* Party list */}
      <section className="flex flex-col gap-3">
        <p
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'var(--color-text-mist)' }}
        >
          Your parties
        </p>

        {/* Skeleton while loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: 'var(--color-surface-petrol)' }}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: 'var(--color-accent-brick)' }}>{error}</p>
        )}

        {/* Empty state — warm, not a blank void */}
        {!loading && !error && parties.length === 0 && (
          <div className="py-16 text-center flex flex-col gap-2">
            <p
              className="font-display text-2xl font-bold"
              style={{ color: 'var(--color-text-cream)' }}
            >
              No parties yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
              Start one — your friends will thank you.
            </p>
          </div>
        )}

        {/* Party cards */}
        {!loading &&
          parties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              onClick={() =>
                navigate({
                  to:
                    party.status === 'resolved'
                      ? '/party/$partyId/results'
                      : '/party/$partyId/lobby',
                  params: { partyId: party.id },
                })
              }
            />
          ))}
      </section>
    </div>
  )
}
