import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getGuestPartyMembers } from '#/features/invites'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/invite/$token/lobby')({ component: GuestLobby })

type LobbyData = Awaited<ReturnType<typeof getGuestPartyMembers>>

function GuestLobby() {
  const { token } = Route.useParams()
  const navigate = useNavigate()

  const [data, setData] = useState<LobbyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await getGuestPartyMembers({ data: { token } })
      setData(result)
      if (result.party.status === 'resolved') {
        navigate({ to: '/invite/$token', params: { token } })
      }
    } catch {
      // handled by null data state
    } finally {
      setLoading(false)
    }
  }, [token, navigate])

  useEffect(() => { load() }, [load])

  // Realtime: refresh member list when anyone submits preferences
  useEffect(() => {
    if (!data?.party.id) return

    const channel = supabase
      .channel(`lobby:${data.party.id}`)
      .on('broadcast', { event: 'member_updated' }, () => load())
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== data.party.id) return
          if (updated.status === 'resolved') {
            navigate({ to: '/invite/$token', params: { token } })
          } else {
            load()
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [data?.party.id, token, load, navigate])

  async function copyLink() {
    if (!data?.party.invite_token) return
    const link = `${window.location.origin}/invite/${data.party.invite_token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (!data?.party.invite_token) return
    const link = `${window.location.origin}/invite/${data.party.invite_token}`
    const text = `Join our Bond party! Add your preferences here: ${link}`
    if (navigator.share) {
      await navigator.share({ title: 'Bond', text, url: link })
    } else {
      window.open(`sms:&body=${encodeURIComponent(text)}`)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="px-6 py-5">
          <div className="h-6 w-16 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-6">
          <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-deep)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>Something went wrong.</p>
      </div>
    )
  }

  const { party, members } = data
  const inviteLink = party.invite_token
    ? `${window.location.origin}/invite/${party.invite_token}`
    : null
  const readyCount = members.filter((m) => m.preferences_submitted_at).length

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="px-6 py-5">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
          Bond
        </span>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-8">
        {/* Party title */}
        <div className="flex items-start justify-between gap-4 pt-2">
          <h1
            className="font-display text-3xl font-semibold leading-tight"
            style={{ color: 'var(--color-text-cream)' }}
          >
            {party.name ?? 'The party'}
          </h1>
          <span
            className="mt-1 shrink-0 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-mist)' }}
          >
            {party.status}
          </span>
        </div>

        {/* You're in confirmation */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: 'var(--color-accent-gold)' }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-cream)' }}>
              You're in. Waiting for the group leader to find a spot.
            </p>
          </div>
          <Link
            to="/invite/$token/preferences"
            params={{ token }}
            search={{ name: '' }}
            className="shrink-0 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-mist)' }}
          >
            Change
          </Link>
        </div>

        {/* Invite link sharing */}
        {inviteLink && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
              Invite others
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
            <button
              onClick={shareLink}
              className="py-3 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-surface-petrol)',
                color: 'var(--color-text-cream)',
                border: '1px solid rgba(240,228,204,0.08)',
              }}
            >
              Share
            </button>
          </section>
        )}

        {/* Member list */}
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
                      style={{
                        background: ready ? 'var(--color-accent-gold)' : 'var(--color-text-mist)',
                        opacity: ready ? 1 : 0.4,
                      }}
                    />
                    {ready ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Create account nudge */}
        <Link
          to="/signup"
          className="w-full py-4 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
        >
          Save Your Preferences
        </Link>
      </main>
    </div>
  )
}
