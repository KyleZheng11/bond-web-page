import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { MapPin, Check, Pencil } from 'lucide-react'
import { useAuth } from '#/features/auth'
import { getPartyLobby } from '#/features/parties'
import { getLeaderPrefsContext, submitPreferences, CUISINES, BUDGETS } from '#/features/preferences'
import { PartyProgressBar } from '#/features/parties'
import { findRestaurant } from '#/features/recommendations'
import { supabase } from '#/lib/supabase'
import type { Tables } from '#/types/database'
import { AppHeader, ShinyButton } from '#/components/ui'

type LobbyData = {
  party: Tables<'parties'>
  members: Tables<'party_members'>[]
  isCreator: boolean
  leaderHasSubmitted: boolean
  memberHasSubmitted: boolean
}

export const Route = createFileRoute('/_auth/party/$partyId/hub')({ component: PartyHub })

const BUDGET_SYMBOL: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const FIRST_N = 12

function ReadyDot({ ready }: { ready: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs font-semibold"
      style={{ color: ready ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: ready ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
      />
      {ready ? 'Ready' : 'Waiting'}
    </span>
  )
}

function PartyHub() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null)
  const [cuisineBlacklist, setCuisineBlacklist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Taste zone form state (local until saved)
  const [tasteEditing, setTasteEditing] = useState(false)
  const [cuisineWants, setCuisineWants] = useState<string[]>([])
  const [budget, setBudget] = useState<number | null>(null)
  const [showAllCuisines, setShowAllCuisines] = useState(false)
  const [submittingTaste, setSubmittingTaste] = useState(false)
  const [tasteError, setTasteError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [result, prefs] = await Promise.all([
        getPartyLobby({ data: { partyId, userId: user.id } }),
        getLeaderPrefsContext({ data: { userId: user.id } }),
      ])
      setLobbyData(result)
      setCuisineBlacklist(prefs.profileCuisineBlacklist)
      if (result.party.status === 'resolved') {
        navigate({ to: '/party/$partyId/result', params: { partyId } })
      }
    } catch {
      // handled by null data state
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, user?.id, navigate])

  useEffect(() => { load() }, [load])

  // Depends on user?.id (a stable string) rather than the user object —
  // Supabase hands back a new session/user object on every auth event
  // (including silent background token refreshes), which was churning
  // this effect and recreating the `lobby:{partyId}` channel faster than
  // the previous one could finish leaving, throwing "cannot add
  // postgres_changes callbacks... after subscribe()".
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`lobby:${partyId}`)
      .on('broadcast', { event: 'member_updated' }, () => load())
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId) return
          if (updated.status === 'voting') {
            navigate({ to: '/party/$partyId/vote', params: { partyId } })
          } else if (updated.status === 'resolved') {
            navigate({ to: '/party/$partyId/result', params: { partyId } })
          } else {
            load()
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, user?.id, load, navigate])

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <div className="max-w-lg mx-auto w-full">
          <AppHeader backTo="/home" />
        </div>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
          ))}
        </main>
      </div>
    )
  }

  if (!lobbyData) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p style={{ color: 'var(--color-ink-soft)' }}>Party not found.</p>
      </div>
    )
  }

  const { party, members, leaderHasSubmitted, isCreator } = lobbyData
  const inviteLink = party.invite_token
    ? `${window.location.origin}/invite/${party.invite_token}`
    : null

  const inviteZoneDone = members.length > 0
  const tasteDone = leaderHasSubmitted && !tasteEditing
  const ctaEnabled = tasteDone

  const ctaLabel = finding
    ? 'Finding…'
    : ctaEnabled
    ? 'Find a restaurant'
    : 'Set your taste first'

  // Cuisine display: first N + any selected outside the first N
  const available = CUISINES.filter((c) => !cuisineBlacklist.includes(c))
  const baseSet = available.slice(0, FIRST_N)
  const selectedTail = cuisineWants.filter((c) => !baseSet.includes(c))
  const visibleCuisines = showAllCuisines ? available : [...baseSet, ...selectedTail]
  const hiddenCount = available.length - visibleCuisines.length

  // Taste summary for collapsed zone
  const tasteSummaryParts: string[] = []
  if (cuisineWants.length > 0) {
    tasteSummaryParts.push(
      cuisineWants.slice(0, 2).join(', ') + (cuisineWants.length > 2 ? ` +${cuisineWants.length - 2}` : ''),
    )
  } else {
    tasteSummaryParts.push('Open to anything')
  }
  if (budget) tasteSummaryParts.push(BUDGET_SYMBOL[budget])

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function shareLink() {
    if (!inviteLink) return
    const text = `Join my Bond party! Add your preferences here: ${inviteLink}`
    if (navigator.share) {
      await navigator.share({ title: 'Bond', text, url: inviteLink })
    } else {
      window.open(`sms:&body=${encodeURIComponent(text)}`)
    }
  }

  async function saveTaste() {
    if (!user || budget === null) return
    setSubmittingTaste(true)
    setTasteError(null)
    try {
      await submitPreferences({
        data: { partyId, userId: user.id, cuisineWants, budgetTier: budget, dietaryRestrictions: [] },
      })
      setTasteEditing(false)
      await load()
    } catch {
      setTasteError('Something went wrong. Try again.')
    } finally {
      setSubmittingTaste(false)
    }
  }

  async function handleFindRestaurant() {
    if (finding) return
    setFinding(true)
    setFindError(null)
    try {
      await findRestaurant({ data: { partyId } })
      // Broadcast so guests jump to voting immediately instead of waiting
      // on postgres replication of the party status change.
      const ch = supabase.channel(`lobby:${partyId}`)
      await ch.send({ type: 'broadcast', event: 'voting_started', payload: {} })
      supabase.removeChannel(ch)
      navigate({ to: '/party/$partyId/vote', params: { partyId } })
    } catch (err) {
      setFindError(err instanceof Error ? err.message : 'Something went wrong.')
      setFinding(false)
    }
  }

  // ── Main Hub view ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="max-w-lg mx-auto w-full shrink-0">
        <AppHeader backTo="/home" />
        <div className="px-6">
          <PartyProgressBar step={2} />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-6 max-w-lg mx-auto w-full pb-52 pt-4 flex flex-col gap-4">

        {/* ── Identity zone ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <h1 className="display text-2xl leading-none">
            {party.name ?? 'Your party'}
          </h1>
          {party.location && (
            <span
              className="self-start inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: '#dcebf4', color: 'var(--color-blueberry)' }}
            >
              <MapPin size={12} aria-hidden />
              {party.location}
            </span>
          )}
        </div>

        {/* ── Invite zone ────────────────────────────────────────── */}
        {!inviteZoneDone ? (
          <div className="glass flex flex-col gap-3 px-5 py-5">
            <p className="eyebrow">Invite the crew</p>
            {inviteLink && (
              <>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-dim)', border: '1px solid var(--color-line)' }}
                >
                  <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                    {inviteLink}
                  </span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-85"
                    style={
                      copied
                        ? { background: 'var(--color-success-soft)', color: 'var(--color-success)' }
                        : { background: 'var(--color-deep)', color: '#ffffff' }
                    }
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Anyone with this link can join and add their preferences.
                </p>
                <button onClick={shareLink} className="btn btn-secondary !rounded-xl py-2.5 text-sm">
                  Share
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Collapsed invite row */}
            <div className="glass flex items-center gap-3 px-4 py-3">
              <div className="flex items-center shrink-0">
                {members.slice(0, 4).map((m, i) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative"
                    style={{
                      background: '#dcebf4',
                      border: '2px solid var(--color-surface)',
                      color: 'var(--color-blueberry)',
                      marginLeft: i === 0 ? 0 : -8,
                      zIndex: members.length - i,
                    }}
                  >
                    {(m.guest_name ?? '?')[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{members.length} in the crew</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  {members.filter((m) => m.preferences_submitted_at).length} of {members.length} ready
                </p>
              </div>
              {inviteLink && (
                <button
                  onClick={shareLink}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-85"
                  style={{ background: 'var(--color-sunrise-soft)', color: 'var(--color-ember-text)' }}
                >
                  Share +
                </button>
              )}
            </div>

            {/* Crew status list */}
            <div className="glass flex flex-col px-1 py-1">
              <p className="eyebrow px-4 pt-3 pb-1">Crew status</p>
              {/* Leader row — always first */}
              {isCreator && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    You
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--color-sunrise)', color: 'var(--color-on-sunrise)' }}
                    >
                      host
                    </span>
                  </span>
                  <ReadyDot ready={leaderHasSubmitted} />
                </div>
              )}
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-2.5 border-t"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <span className="text-sm font-medium">{m.guest_name ?? '—'}</span>
                  <ReadyDot ready={!!m.preferences_submitted_at} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Taste zone ─────────────────────────────────────────── */}
        {tasteDone ? (
          <div className="glass flex items-center gap-3 px-4 py-3">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}
            >
              <Check size={15} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Your taste</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                {tasteSummaryParts.join(' · ')}
              </p>
            </div>
            <button
              onClick={() => setTasteEditing(true)}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              <Pencil size={12} aria-hidden />
              Edit
            </button>
          </div>
        ) : (
          <div className="glass flex flex-col gap-4 px-5 py-5" style={{ borderColor: 'var(--color-bond)', borderWidth: '1.5px' }}>
            <p className="eyebrow">Your taste</p>

            {/* Cuisine chips */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold">In the mood for?</p>
              <div className="flex flex-wrap gap-2">
                {visibleCuisines.map((c) => {
                  const sel = cuisineWants.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() =>
                        setCuisineWants((prev) => sel ? prev.filter((x) => x !== c) : [...prev, c])
                      }
                      aria-pressed={sel}
                      className={`chip-glass ${sel ? 'chip-glass-active' : ''}`}
                    >
                      {c}
                    </button>
                  )
                })}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllCuisines(true)}
                    className="chip-glass"
                    style={{ borderStyle: 'dashed', color: 'var(--color-ink-soft)', background: 'transparent' }}
                  >
                    + {hiddenCount} more
                  </button>
                )}
                {showAllCuisines && (
                  <button
                    onClick={() => setShowAllCuisines(false)}
                    className="chip-glass"
                    style={{ borderStyle: 'dashed', color: 'var(--color-ink-soft)', background: 'transparent' }}
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>

            {/* Budget bar */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold">Budget</p>
              <div className="flex gap-2">
                {BUDGETS.map(({ tier, symbol }: { tier: number; symbol: string; label: string; sub: string }) => {
                  const active = budget === tier
                  return (
                    <button
                      key={tier}
                      onClick={() => setBudget(tier)}
                      aria-pressed={active}
                      className={`chip-glass flex-1 justify-center !rounded-xl font-bold ${active ? 'chip-glass-active' : ''}`}
                    >
                      {symbol}
                    </button>
                  )
                })}
              </div>
            </div>

            {tasteError && (
              <p role="alert" className="text-xs" style={{ color: 'var(--color-error)' }}>{tasteError}</p>
            )}

            <button
              onClick={saveTaste}
              disabled={budget === null || submittingTaste}
              className="btn btn-dark w-full py-3 !rounded-2xl text-sm"
            >
              {submittingTaste ? 'Saving…' : 'Save my taste'}
            </button>
          </div>
        )}
      </main>

      {/* ── Pinned CTA ──────────────────────────────────────────────
          A frosted scrim, not a flat fade — it blurs and softly tints
          whatever sky color sits behind it instead of masking it with
          an opaque box, so the wash stays visible underneath. */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-6"
        style={{
          background: 'linear-gradient(to top, rgba(237,238,243,0.92) 55%, rgba(237,238,243,0) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {/* Hint — only shown when CTA is locked */}
          {!ctaEnabled && (
            <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-soft)' }}>
              Set your taste above to unlock this.
            </p>
          )}

          <ShinyButton
            onClick={() => ctaEnabled && !finding && handleFindRestaurant()}
            disabled={!ctaEnabled || finding}
            className="w-full"
          >
            {ctaLabel}
          </ShinyButton>

          {findError && (
            <p role="alert" className="text-xs text-center" style={{ color: 'var(--color-error)' }}>{findError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
