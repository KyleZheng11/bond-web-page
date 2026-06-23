import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { resolveInvite } from '#/features/invites'

export const Route = createFileRoute('/invite/$token/')({ component: InviteLanding })

type InviteData = Awaited<ReturnType<typeof resolveInvite>>

function InviteLanding() {
  const { token } = Route.useParams()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    resolveInvite({ data: { token } })
      .then((result) => {
        if (result.party.status === 'resolved') {
          navigate({ to: '/party/$partyId/results', params: { partyId: result.party.id } })
          return
        }
        setInvite(result)
      })
      .catch((err: Error) => setErrorMsg(err.message))
      .finally(() => setLoading(false))
  }, [token, navigate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    navigate({ to: '/invite/$token/preferences', params: { token }, search: { name: name.trim() } })
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <div className="h-8 w-32 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        <div className="h-14 w-64 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        <div className="h-14 w-full max-w-sm rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (errorMsg || !invite) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <span className="font-display text-4xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>
          Bond
        </span>
        <h1 className="font-display text-2xl font-semibold mt-4" style={{ color: 'var(--color-text-cream)' }}>
          This link isn't working.
        </h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-mist)' }}>
          {errorMsg || 'The invite link is invalid or has been removed. Ask your group leader for a new one.'}
        </p>
      </div>
    )
  }

  // ── Already submitted — send them to the lobby ────────────────────────────
  if (invite.alreadySubmitted) {
    navigate({ to: '/invite/$token/lobby', params: { token } })
    return null
  }

  const partyName = invite.party.name
  const memberLabel = invite.memberCount === 1 ? '1 person joining' : `${invite.memberCount} people joining`

  // ── Main landing ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col px-6 py-10 max-w-sm mx-auto"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>
        Bond
      </span>

      <motion.div
        className="flex-1 flex flex-col justify-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex flex-col gap-3">
          <h1
            className="font-display text-4xl font-semibold leading-tight"
            style={{ color: 'var(--color-text-cream)' }}
          >
            {invite.leaderName} is picking a restaurant.
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-mist)' }}>
            They want your input — it only takes a minute.
          </p>
        </div>

        <div
          className="flex flex-col gap-1 px-4 py-4 rounded-2xl"
          style={{ background: 'var(--color-surface-petrol)' }}
        >
          {partyName && (
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-cream)' }}>
              {partyName}
            </p>
          )}
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            {memberLabel}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-text-mist)' }}
            >
              Your name
            </label>
            <input
              type="text"
              placeholder="What should we call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-twilight)',
                border: `1px solid ${name.trim() ? 'var(--color-accent-ember)' : 'rgba(240,228,204,0.08)'}`,
                color: 'var(--color-text-cream)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
            style={{
              background: name.trim() ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
              color: name.trim() ? 'var(--color-on-ember)' : 'var(--color-text-mist)',
              opacity: name.trim() ? 1 : 0.5,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add your preferences →
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: 'var(--color-text-mist)' }}>
          No account needed.
        </p>
      </motion.div>
    </div>
  )
}
