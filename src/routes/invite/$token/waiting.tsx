import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { resolveInvite } from '#/features/invites'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/invite/$token/waiting')({ component: WaitingScreen })

function WaitingScreen() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [leaderName, setLeaderName] = useState<string | null>(null)
  const [partyId, setPartyId] = useState<string | null>(null)

  useEffect(() => {
    resolveInvite({ data: { token } })
      .then((result) => {
        setLeaderName(result.leaderName)
        setPartyId(result.party.id)
        if (result.party.status === 'voting') {
          navigate({ to: '/invite/$token/vote', params: { token } })
        } else if (result.party.status === 'resolved') {
          navigate({ to: '/party/$partyId/results', params: { partyId: result.party.id } })
        }
      })
      .catch(() => {})
  }, [token, navigate])

  // Watch for the party moving to voting or resolved
  useEffect(() => {
    if (!partyId) return
    const channel = supabase
      .channel(`waiting:${partyId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId) return
          if (updated.status === 'voting') {
            navigate({ to: '/invite/$token/vote', params: { token } })
          } else if (updated.status === 'resolved') {
            navigate({ to: '/party/$partyId/results', params: { partyId } })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [partyId, token, navigate])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <motion.div
        className="flex flex-col items-center gap-6 max-w-xs"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-accent-aurora)' }}
        >
          ✓
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="font-display text-3xl font-semibold leading-tight"
            style={{ color: 'var(--color-text-cream)' }}
          >
            You're in.
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-mist)' }}>
            {leaderName
              ? `Waiting for ${leaderName} to find restaurant options.`
              : 'Waiting for the group to find restaurant options.'}
          </p>
        </div>

        <div
          className="w-full px-4 py-3 rounded-2xl text-sm"
          style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
        >
          Your preferences are private — no one else in the group will see them.
        </div>

        <div className="flex flex-col items-center gap-2 mt-2">
          <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
            Want to save your preferences for next time?
          </p>
          <Link
            to="/signup"
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-accent-gold)' }}
          >
            Create an account →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
