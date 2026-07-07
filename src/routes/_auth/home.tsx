import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Users, Plus } from 'lucide-react'
import { useAuth } from '#/features/auth'
import { useParties, PartyCard, deleteParty } from '#/features/parties'
import { Wordmark, Avatar, ShinyButton } from '#/components/ui'

export const Route = createFileRoute('/_auth/home')({ component: Home })

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning.'
  if (h < 17) return 'Good afternoon.'
  if (h < 21) return 'Good evening.'
  return 'Got plans?'
}

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { parties, loading, error, refresh } = useParties(user?.id)

  return (
    <div className="min-h-dvh px-6 py-8 max-w-lg md:max-w-285 mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Bond home" className="transition-opacity hover:opacity-80">
          <Wordmark className="text-2xl" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/friends"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 min-h-10 rounded-full transition-colors card !rounded-full !shadow-none hover:!bg-(--color-surface-dim)"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            <Users size={15} aria-hidden />
            Friends
          </Link>
          <button
            onClick={() => navigate({ to: '/profile' })}
            aria-label="Your profile"
            className="rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Avatar name={user?.email} size="md" />
          </button>
        </div>
      </header>

      {/* Greeting + dawn CTA card */}
      <motion.div
        className="flex flex-col gap-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="display text-4xl leading-none">{greeting()}</h1>
        <ShinyButton
          onClick={() => navigate({ to: '/party/new' })}
          className="w-full h-auto rounded-[24px] px-6 py-7 text-left justify-start"
        >
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex flex-col gap-1">
              <span className="font-display font-bold text-xl" style={{ color: '#ffffff' }}>
                Start a new party
              </span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                One link, one pick, zero debate.
              </span>
            </div>
            <span className="party-cta-icon w-12 h-12 rounded-full flex items-center justify-center shrink-0">
              <Plus size={24} aria-hidden />
            </span>
          </div>
        </ShinyButton>
      </motion.div>

      {/* Party list — a single column on mobile (unchanged); on a
          laptop-wide screen it becomes a real grid instead of one
          narrow column stretched down the middle of the page. */}
      <section className="flex flex-col gap-3">
        <p className="eyebrow">Your parties</p>

        {/* Skeleton while loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-18 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
        )}

        {/* Empty state — warm, not a blank void */}
        {!loading && !error && parties.length === 0 && (
          <div className="card py-14 px-6 text-center flex flex-col items-center gap-2 md:max-w-md md:mx-auto md:w-full">
            <p className="display text-2xl">No parties yet.</p>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Start one — your friends will thank you.
            </p>
          </div>
        )}

        {/* Party cards */}
        {!loading && parties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parties.map((party) => (
              <PartyCard
                key={party.id}
                party={party}
                onClick={() =>
                  navigate({
                    to:
                      party.status === 'resolved'
                        ? '/party/$partyId/result'
                        : '/party/$partyId/hub',
                    params: { partyId: party.id },
                  })
                }
                onDelete={
                  party.creator_id === user?.id
                    ? async () => {
                        await deleteParty({ data: { partyId: party.id, userId: user.id } })
                        refresh()
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
