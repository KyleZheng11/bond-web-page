import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth, signOut, getUserProfile, updateDietaryRestrictions, updateLocation, updateCuisineBlacklist } from '#/features/auth'
import { getMyParties, PartyCard } from '#/features/parties'
import { LocationInput } from '#/features/parties/components/LocationInput'
import { DIETARY, CUISINES } from '#/features/preferences'
import type { Party } from '#/features/parties'

export const Route = createFileRoute('/_auth/profile')({ component: Profile })

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Saved values
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [cuisineBlacklist, setCuisineBlacklist] = useState<string[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Dietary edit state
  const [editingDietary, setEditingDietary] = useState(false)
  const [draftRestrictions, setDraftRestrictions] = useState<string[]>([])
  const [savingDietary, setSavingDietary] = useState(false)
  const [dietaryFlash, setDietaryFlash] = useState(false)

  // Cuisine blacklist edit state
  const [editingBlacklist, setEditingBlacklist] = useState(false)
  const [draftBlacklist, setDraftBlacklist] = useState<string[]>([])
  const [savingBlacklist, setSavingBlacklist] = useState(false)
  const [blacklistFlash, setBlacklistFlash] = useState(false)

  // Location edit state
  const [editingLocation, setEditingLocation] = useState(false)
  const [draftLocation, setDraftLocation] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationFlash, setLocationFlash] = useState(false)

  const [parties, setParties] = useState<Party[]>([])
  const [loadingParties, setLoadingParties] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserProfile({ data: { userId: user.id } })
      .then((p) => {
        setRestrictions(p.dietary_restrictions)
        setLocation(p.location ?? '')
        setCuisineBlacklist(p.cuisine_blacklist)
      })
      .finally(() => setLoadingProfile(false))
    getMyParties({ data: { userId: user.id } })
      .then(setParties)
      .finally(() => setLoadingParties(false))
  }, [user])

  // ── Dietary restrictions ──────────────────────────────────────────────────

  function startEditingDietary() {
    setDraftRestrictions([...restrictions])
    setEditingDietary(true)
  }

  function cancelDietary() {
    setEditingDietary(false)
  }

  function toggleDraft(item: string) {
    setDraftRestrictions((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    )
  }

  async function saveDietary() {
    if (!user) return
    setSavingDietary(true)
    try {
      await updateDietaryRestrictions({ data: { userId: user.id, restrictions: draftRestrictions } })
      setRestrictions(draftRestrictions)
      setEditingDietary(false)
      setDietaryFlash(true)
      setTimeout(() => setDietaryFlash(false), 2000)
    } finally {
      setSavingDietary(false)
    }
  }

  // ── Cuisine blacklist ─────────────────────────────────────────────────────

  function startEditingBlacklist() {
    setDraftBlacklist([...cuisineBlacklist])
    setEditingBlacklist(true)
  }

  function cancelBlacklist() {
    setEditingBlacklist(false)
  }

  function toggleBlacklistDraft(item: string) {
    setDraftBlacklist((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    )
  }

  async function saveBlacklist() {
    if (!user) return
    setSavingBlacklist(true)
    try {
      await updateCuisineBlacklist({ data: { userId: user.id, blacklist: draftBlacklist } })
      setCuisineBlacklist(draftBlacklist)
      setEditingBlacklist(false)
      setBlacklistFlash(true)
      setTimeout(() => setBlacklistFlash(false), 2000)
    } finally {
      setSavingBlacklist(false)
    }
  }

  // ── Location ─────────────────────────────────────────────────────────────

  function startEditingLocation() {
    setDraftLocation(location)
    setEditingLocation(true)
  }

  function cancelLocation() {
    setEditingLocation(false)
  }

  async function saveLocationField() {
    if (!user || !draftLocation.trim()) return
    setSavingLocation(true)
    try {
      await updateLocation({ data: { userId: user.id, location: draftLocation.trim() } })
      setLocation(draftLocation.trim())
      setEditingLocation(false)
      setLocationFlash(true)
      setTimeout(() => setLocationFlash(false), 2000)
    } finally {
      setSavingLocation(false)
    }
  }

  // ── Misc ─────────────────────────────────────────────────────────────────

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/welcome' })
  }

  function partyDestination(party: Party) {
    return party.status === 'resolved'
      ? { to: '/party/$partyId/result' as const, params: { partyId: party.id } }
      : { to: '/party/$partyId/hub' as const, params: { partyId: party.id } }
  }

  const initial = user?.email?.[0].toUpperCase() ?? '?'
  const name = user?.user_metadata?.full_name ?? user?.email ?? '—'

  return (
    <div
      className="min-h-screen px-6 py-10 max-w-md mx-auto flex flex-col gap-8"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
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
        className="flex flex-col items-center gap-3 py-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
          style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-accent-gold)' }}
        >
          {initial}
        </div>
        <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-cream)' }}>
          {name}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
          {user?.email}
        </p>
      </motion.div>

      {/* ── Dietary restrictions ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Dietary restrictions
          </p>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-xs font-semibold"
              style={{ color: 'var(--color-accent-aurora)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: dietaryFlash ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Saved
            </motion.span>
            {!editingDietary ? (
              <button
                onClick={startEditingDietary}
                disabled={loadingProfile}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
                style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)' }}
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelDietary}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveDietary}
                  disabled={savingDietary}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                >
                  {savingDietary ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
          Never shown to other members of your party.
        </p>

        {loadingProfile ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 rounded-full animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
            ))}
          </div>
        ) : editingDietary ? (
          <div className="flex flex-wrap gap-2">
            {DIETARY.map((item) => {
              const active = draftRestrictions.includes(item)
              return (
                <button
                  key={item}
                  onClick={() => toggleDraft(item)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: active ? 'var(--color-accent-ember)' : 'var(--color-surface-petrol)',
                    color: active ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                    border: `1px solid ${active ? 'transparent' : 'rgba(240,228,204,0.08)'}`,
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {restrictions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>None</p>
            ) : (
              restrictions.map((item) => (
                <span
                  key={item}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                >
                  {item}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Cuisine blacklist ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Cuisines I never eat
          </p>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-xs font-semibold"
              style={{ color: 'var(--color-accent-aurora)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: blacklistFlash ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Saved
            </motion.span>
            {!editingBlacklist ? (
              <button
                onClick={startEditingBlacklist}
                disabled={loadingProfile}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
                style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)' }}
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelBlacklist}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveBlacklist}
                  disabled={savingBlacklist}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                >
                  {savingBlacklist ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
          These cuisines will never appear in your recommendations.
        </p>

        {loadingProfile ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 rounded-full animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
            ))}
          </div>
        ) : editingBlacklist ? (
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((item) => {
              const active = draftBlacklist.includes(item)
              return (
                <button
                  key={item}
                  onClick={() => toggleBlacklistDraft(item)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: active ? 'var(--color-accent-brick)' : 'var(--color-surface-petrol)',
                    color: active ? 'var(--color-on-brick)' : 'var(--color-text-cream)',
                    border: `1px solid ${active ? 'transparent' : 'rgba(240,228,204,0.08)'}`,
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cuisineBlacklist.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>None</p>
            ) : (
              cuisineBlacklist.map((item) => (
                <span
                  key={item}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ background: 'var(--color-accent-brick)', color: 'var(--color-on-brick)' }}
                >
                  {item}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Location ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Default location
          </p>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-xs font-semibold"
              style={{ color: 'var(--color-accent-aurora)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: locationFlash ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Saved
            </motion.span>
            {!editingLocation ? (
              <button
                onClick={startEditingLocation}
                disabled={loadingProfile}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
                style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)' }}
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelLocation}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveLocationField}
                  disabled={savingLocation || !draftLocation.trim()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                >
                  {savingLocation ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loadingProfile ? (
          <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        ) : editingLocation ? (
          <LocationInput value={draftLocation} onChange={setDraftLocation} />
        ) : (
          <p className="text-sm font-medium" style={{ color: location ? 'var(--color-text-cream)' : 'var(--color-text-mist)' }}>
            {location || 'Not set'}
          </p>
        )}
      </section>

      {/* ── Past parties ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
          Past parties
        </p>
        {loadingParties ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
            ))}
          </div>
        ) : parties.length === 0 ? (
          <div
            className="py-8 rounded-2xl flex flex-col items-center gap-2"
            style={{ background: 'var(--color-surface-petrol)' }}
          >
            <p className="font-display text-base" style={{ color: 'var(--color-text-cream)' }}>
              No parties yet.
            </p>
            <Link to="/party/new" className="text-sm font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
              Start one →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {parties.map((party) => {
              const dest = partyDestination(party)
              return (
                <PartyCard
                  key={party.id}
                  party={party}
                  onClick={() => navigate({ to: dest.to, params: dest.params })}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Log out ── */}
      <div className="mt-4">
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-accent-brick)' }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
