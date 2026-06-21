import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '#/features/auth'
import { getPartyLobby } from '#/features/parties'
import { findRestaurant } from '#/features/recommendations'
import { supabase } from '#/lib/supabase'
import type { Tables } from '#/types/database'

type LobbyData = {
  party: Tables<'parties'>
  members: Tables<'party_members'>[]
  isCreator: boolean
  leaderHasSubmitted: boolean
  memberHasSubmitted: boolean
}

export const Route = createFileRoute('/_auth/party/$partyId/lobby')({ component: Lobby })

function Lobby() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<LobbyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const result = await getPartyLobby({ data: { partyId, userId: user.id } })
      setData(result)
      // If party already resolved, go straight to results
      if (result.party.status === 'resolved') {
        navigate({ to: '/party/$partyId/results', params: { partyId } })
      }
    } catch {
      // handled by empty data state
    } finally {
      setLoading(false)
    }
  }, [partyId, user, navigate])

  // Initial load
  useEffect(() => { load() }, [load])

  // Realtime: refire load on any party_members or parties change
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`lobby:${partyId}`)
      // Broadcast from guest browser after they submit preferences
      .on('broadcast', { event: 'member_updated' }, () => load())
      // Navigate on status changes
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId) return
          if (updated.status === 'voting') {
            navigate({ to: '/party/$partyId/vote', params: { partyId } })
          } else {
            load()
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partyId, user, load])

  async function handleFindRestaurant() {
    if (!canFindRestaurant || !user || finding) return
    setFinding(true)
    setFindError(null)
    try {
      await findRestaurant({ data: { partyId } })
      navigate({ to: '/party/$partyId/vote', params: { partyId } })
    } catch (err) {
      setFindError(err instanceof Error ? err.message : 'Something went wrong, try again.')
      setFinding(false)
    }
  }

  async function copyLink() {
    if (!data?.party.invite_token) return
    const link = `${window.location.origin}/invite/${data.party.invite_token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="flex items-center gap-4 px-6 py-5">
          <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-6">
          <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-deep)' }}>
        <p style={{ color: 'var(--color-text-mist)' }}>Party not found.</p>
      </div>
    )
  }

  const { party, members, isCreator, leaderHasSubmitted, memberHasSubmitted } = data
  const inviteLink = party.invite_token
    ? `${window.location.origin}/invite/${party.invite_token}`
    : null
  const readyCount = members.filter((m) => m.preferences_submitted_at).length
  const canFindRestaurant = leaderHasSubmitted

  const header = (
    <header className="flex items-center gap-4 px-6 py-5">
      <Link
        to="/home"
        className="text-sm font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-mist)' }}
      >
        ← Back
      </Link>
      <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
        Bond
      </span>
    </header>
  )

  // ── Member view (invited friend, not the creator) ─────────────────────────
  if (!isCreator) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}>
        {header}
        <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-8">
          <div className="flex items-start justify-between gap-4 pt-2">
            <h1 className="font-display text-3xl font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
              {party.name ?? 'Party'}
            </h1>
            <span
              className="mt-1 shrink-0 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-mist)' }}
            >
              {party.status}
            </span>
          </div>

          {/* Their preferences */}
          <section
            className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
            style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
                Your preferences
              </p>
              {memberHasSubmitted && (
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent-gold)' }} />
                  Ready
                </span>
              )}
            </div>
            {memberHasSubmitted ? (
              <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                You're all set. Waiting for the group leader to find options.
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                  You haven't added your preferences yet.
                </p>
                <Link
                  to="/party/$partyId/preferences"
                  params={{ partyId }}
                  className="mt-1 py-3 rounded-xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                >
                  Add your preferences →
                </Link>
              </>
            )}
          </section>

          {/* Who else is in the party */}
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
              The crew · {readyCount} of {members.length} ready
            </p>
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const ready = !!member.preferences_submitted_at
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl gap-3"
                    style={{ background: 'var(--color-surface-petrol)' }}
                  >
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-cream)' }}>
                      {member.guest_name ?? '—'}
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold shrink-0"
                      style={{ color: ready ? 'var(--color-accent-gold)' : 'var(--color-text-mist)' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: ready ? 'var(--color-accent-gold)' : 'var(--color-text-mist)', opacity: ready ? 1 : 0.4 }}
                      />
                      {ready ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ── Creator view ──────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      {header}

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-8">
        {/* Party title + status */}
        <div className="flex items-start justify-between gap-4 pt-2">
          <h1 className="font-display text-3xl font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
            {party.name ?? 'Your party'}
          </h1>
          <span
            className="mt-1 shrink-0 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-mist)' }}
          >
            {party.status}
          </span>
        </div>

        {/* Invite link */}
        {inviteLink && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
              Share the link
            </p>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
            >
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-mist)' }}>
                {inviteLink}
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  background: copied ? 'var(--color-surface-twilight)' : 'var(--color-accent-ember)',
                  color: copied ? 'var(--color-text-mist)' : 'var(--color-on-ember)',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={`sms:&body=${encodeURIComponent(`Join my Bond party! Add your preferences here: ${inviteLink}`)}`}
              className="py-3 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)', border: '1px solid rgba(240,228,204,0.08)' }}
            >
              Send via SMS
            </a>
          </section>
        )}

        {/* Member list */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Your crew{members.length > 0 ? ` · ${readyCount} of ${members.length} ready` : ''}
          </p>

          {members.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--color-text-mist)' }}>
              No one has joined yet. Share the link above.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const ready = !!member.preferences_submitted_at
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl gap-3"
                    style={{ background: 'var(--color-surface-petrol)' }}
                  >
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-cream)' }}>
                      {member.guest_name ?? '—'}
                    </span>
                    {ready ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0" style={{ color: 'var(--color-accent-gold)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent-gold)' }} />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0" style={{ color: 'var(--color-text-mist)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-text-mist)', opacity: 0.4 }} />
                        Waiting
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Leader preferences */}
        <section
          className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
              Your preferences
            </p>
            {leaderHasSubmitted && (
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent-gold)' }} />
                Ready
              </span>
            )}
          </div>

          {leaderHasSubmitted ? (
            <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
              You're all set. Waiting for the rest of your crew.
            </p>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                You haven't added your preferences yet.
              </p>
              <Link
                to="/party/$partyId/preferences"
                params={{ partyId }}
                className="mt-1 py-3 rounded-xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-cream)' }}
              >
                Add your preferences →
              </Link>
            </>
          )}
        </section>

        {/* Find a restaurant CTA */}
        <button
          disabled={!canFindRestaurant || finding}
          onClick={handleFindRestaurant}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
          style={{
            background: canFindRestaurant ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
            color: canFindRestaurant ? 'var(--color-on-ember)' : 'var(--color-text-mist)',
            opacity: canFindRestaurant && !finding ? 1 : 0.6,
            cursor: canFindRestaurant && !finding ? 'pointer' : 'not-allowed',
          }}
        >
          {finding ? 'Finding your spot…' : 'Find a restaurant'}
        </button>

        {!canFindRestaurant && !finding && (
          <p className="text-xs text-center -mt-4" style={{ color: 'var(--color-text-mist)' }}>
            Add your preferences above to unlock this.
          </p>
        )}

        {findError && (
          <p className="text-xs text-center -mt-4" style={{ color: 'var(--color-accent-brick)' }}>
            {findError}
          </p>
        )}
      </main>
    </div>
  )
}
