import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth, signOut, getUserProfile, updateDietaryRestrictions, updateLocation, updateCuisineBlacklist } from '#/features/auth'
import { getMyParties, PartyCard } from '#/features/parties'
import { LocationInput } from '#/features/parties/components/LocationInput'
import { DIETARY, CUISINES } from '#/features/preferences'
import type { Party } from '#/features/parties'
import { AppHeader, Avatar } from '#/components/ui'

export const Route = createFileRoute('/_auth/profile')({ component: Profile })

/* Section header with the edit / cancel+save controls all sections share */
function SectionHeader({
  title,
  editing,
  saving,
  flash,
  onEdit,
  onCancel,
  onSave,
  editDisabled,
  saveDisabled,
}: {
  title: string
  editing: boolean
  saving: boolean
  flash: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  editDisabled?: boolean
  saveDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="eyebrow">{title}</p>
      <div className="flex items-center gap-2">
        <motion.span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-success)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: flash ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          Saved
        </motion.span>
        {!editing ? (
          <button
            onClick={onEdit}
            disabled={editDisabled}
            className="btn btn-secondary !min-h-8 !py-1 !px-3 text-xs"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn btn-ghost !min-h-8 !py-1 !px-3 text-xs">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || saveDisabled}
              className="btn btn-primary !min-h-8 !py-1 !px-3 text-xs"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

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

  const name = user?.user_metadata?.full_name ?? user?.email ?? '—'

  return (
    <div className="min-h-dvh">
      <div className="max-w-lg mx-auto w-full flex flex-col gap-6 pb-12">
        <AppHeader backTo="/home" />

        {/* Identity */}
        <motion.div
          className="flex flex-col items-center gap-3 px-6 py-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Avatar name={name} size="lg" />
          <p className="display text-2xl">{name}</p>
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            {user?.email}
          </p>
        </motion.div>

        <div className="flex flex-col gap-4 px-6">
          {/* ── Dietary restrictions ── */}
          <section className="card p-5 flex flex-col gap-3">
            <SectionHeader
              title="Dietary restrictions"
              editing={editingDietary}
              saving={savingDietary}
              flash={dietaryFlash}
              onEdit={startEditingDietary}
              onCancel={() => setEditingDietary(false)}
              onSave={saveDietary}
              editDisabled={loadingProfile}
            />
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Never shown to other members of your party.
            </p>

            {loadingProfile ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-24 rounded-full animate-pulse" style={{ background: 'var(--color-surface-dim)' }} />
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
                      aria-pressed={active}
                      className={`chip ${active ? 'chip-active' : ''}`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {restrictions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>None</p>
                ) : (
                  restrictions.map((item) => (
                    <span
                      key={item}
                      className="px-3.5 py-1.5 rounded-full text-sm font-medium"
                      style={{ background: 'var(--color-deep)', color: '#ffffff' }}
                    >
                      {item}
                    </span>
                  ))
                )}
              </div>
            )}
          </section>

          {/* ── Cuisine blacklist ── */}
          <section className="card p-5 flex flex-col gap-3">
            <SectionHeader
              title="Cuisines I never eat"
              editing={editingBlacklist}
              saving={savingBlacklist}
              flash={blacklistFlash}
              onEdit={startEditingBlacklist}
              onCancel={() => setEditingBlacklist(false)}
              onSave={saveBlacklist}
              editDisabled={loadingProfile}
            />
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              These cuisines will never appear in your recommendations.
            </p>

            {loadingProfile ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-24 rounded-full animate-pulse" style={{ background: 'var(--color-surface-dim)' }} />
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
                      aria-pressed={active}
                      className={`chip chip-danger ${active ? 'chip-active' : ''}`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cuisineBlacklist.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>None</p>
                ) : (
                  cuisineBlacklist.map((item) => (
                    <span
                      key={item}
                      className="px-3.5 py-1.5 rounded-full text-sm font-medium"
                      style={{ background: 'var(--color-error)', color: '#ffffff' }}
                    >
                      {item}
                    </span>
                  ))
                )}
              </div>
            )}
          </section>

          {/* ── Location ── */}
          <section className="card p-5 flex flex-col gap-3">
            <SectionHeader
              title="Default location"
              editing={editingLocation}
              saving={savingLocation}
              flash={locationFlash}
              onEdit={startEditingLocation}
              onCancel={() => setEditingLocation(false)}
              onSave={saveLocationField}
              editDisabled={loadingProfile}
              saveDisabled={!draftLocation.trim()}
            />
            {loadingProfile ? (
              <div className="h-11 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-dim)' }} />
            ) : editingLocation ? (
              <LocationInput value={draftLocation} onChange={setDraftLocation} />
            ) : (
              <p className="text-sm font-medium" style={{ color: location ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}>
                {location || 'Not set'}
              </p>
            )}
          </section>

          {/* ── Past parties ── */}
          <section className="flex flex-col gap-3 pt-2">
            <p className="eyebrow">Past parties</p>
            {loadingParties ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
                ))}
              </div>
            ) : parties.length === 0 ? (
              <div className="card py-8 flex flex-col items-center gap-2">
                <p className="font-display text-base">No parties yet.</p>
                <Link
                  to="/party/new"
                  className="text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-blueberry)' }}
                >
                  Start one →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <button
            onClick={handleSignOut}
            className="btn btn-secondary w-full py-3.5 mt-2"
            style={{ color: 'var(--color-error)' }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
