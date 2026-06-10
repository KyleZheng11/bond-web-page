import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useAuth, signOut, getUserProfile, updateDietaryRestrictions } from '#/features/auth'
import { getMyParties, PartyCard } from '#/features/parties'
import type { Party } from '#/features/parties'

export const Route = createFileRoute('/_auth/profile')({ component: Profile })

const DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-free',
  'Halal', 'Kosher', 'Dairy-free',
  'Nut-free', 'Shellfish-free',
]

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [restrictions, setRestrictions] = useState<string[]>([])
  const [savedFlash, setSavedFlash] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingParties, setLoadingParties] = useState(true)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    getUserProfile({ data: { userId: user.id } })
      .then((p) => setRestrictions(p.dietary_restrictions as string[]))
      .finally(() => setLoadingProfile(false))
    getMyParties({ data: { userId: user.id } })
      .then(setParties)
      .finally(() => setLoadingParties(false))
  }, [user])

  async function toggleRestriction(item: string) {
    if (!user) return
    const next = restrictions.includes(item)
      ? restrictions.filter((r) => r !== item)
      : [...restrictions, item]
    setRestrictions(next)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    await updateDietaryRestrictions({ data: { userId: user.id, restrictions: next } })
    setSavedFlash(true)
    saveTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/welcome' })
  }

  function partyDestination(party: Party) {
    return party.status === 'resolved'
      ? { to: '/party/$partyId/results' as const, params: { partyId: party.id } }
      : { to: '/party/$partyId/lobby' as const, params: { partyId: party.id } }
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

      {/* Dietary restrictions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Dietary restrictions
          </p>
          <motion.span
            className="text-xs font-semibold"
            style={{ color: 'var(--color-accent-aurora)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: savedFlash ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            Saved
          </motion.span>
        </div>

        <p className="text-xs font-medium" style={{ color: 'var(--color-text-mist)' }}>
          Never shown to other members of your party.
        </p>

        {loadingProfile ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 w-24 rounded-full animate-pulse"
                style={{ background: 'var(--color-surface-petrol)' }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {DIETARY.map((item) => {
              const active = restrictions.includes(item)
              return (
                <button
                  key={item}
                  onClick={() => toggleRestriction(item)}
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
        )}
      </section>

      {/* Past parties */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
          Past parties
        </p>

        {loadingParties ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: 'var(--color-surface-petrol)' }}
              />
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
            <Link
              to="/party/new"
              className="text-sm font-semibold"
              style={{ color: 'var(--color-accent-ember)' }}
            >
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

      {/* Log out */}
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
