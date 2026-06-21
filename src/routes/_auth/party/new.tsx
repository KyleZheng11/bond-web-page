import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '#/features/auth'
import { createParty, inviteFriends, LocationInput } from '#/features/parties'
import { getFriends } from '#/features/friends'
import type { Friend } from '#/features/friends'

export const Route = createFileRoute('/_auth/party/new')({ component: NewParty })

function NewParty() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set())
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getFriends({ data: { userId: user.id } }).then(setFriends)
  }, [user])

  function toggleFriend(id: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!location.trim()) {
      setError('Please enter a location.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const party = await createParty({
        data: {
          name: name.trim() || undefined,
          location: location.trim(),
          creatorId: user.id,
        },
      })

      if (selectedFriendIds.size > 0) {
        await inviteFriends({ data: { partyId: party.id, friendUserIds: [...selectedFriendIds] } })
      }

      navigate({ to: '/party/$partyId/lobby', params: { partyId: party.id } })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      {/* Header */}
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

      <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full">
        <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--color-text-cream)' }}>
          Start a party.
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-mist)' }}>
          Invite your crew and let Bond find the perfect spot.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Party name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-mist)' }}>
              Party name{' '}
              <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Saturday Night, Team Lunch…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-twilight)',
                border: '1px solid rgba(240,228,204,0.08)',
                color: 'var(--color-text-cream)',
              }}
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-mist)' }}>
              Location <span style={{ color: 'var(--color-accent-brick)' }}>*</span>
            </label>
            <LocationInput value={location} onChange={setLocation} />
          </div>

          {/* Friends picker */}
          {friends.length > 0 && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-mist)' }}>
                Invite friends
              </label>
              <div className="flex flex-col gap-2">
                {friends.map((friend) => {
                  const selected = selectedFriendIds.has(friend.userId)
                  return (
                    <button
                      key={friend.userId}
                      type="button"
                      onClick={() => toggleFriend(friend.userId)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                      style={{
                        background: selected ? 'var(--color-surface-twilight)' : 'var(--color-surface-petrol)',
                        border: `1px solid ${selected ? 'var(--color-accent-ember)' : 'rgba(240,228,204,0.06)'}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: selected ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
                          color: selected ? 'var(--color-on-ember)' : 'var(--color-accent-gold)',
                        }}
                      >
                        {(friend.displayName ?? friend.email)[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text-cream)' }}>
                        {friend.displayName ?? friend.email.split('@')[0]}
                      </span>
                      {selected && (
                        <span className="text-xs font-bold shrink-0" style={{ color: 'var(--color-accent-ember)' }}>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-accent-brick)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
          >
            {loading ? 'Creating…' : selectedFriendIds.size > 0 ? `Invite friends (${selectedFriendIds.size})` : 'Create party'}
          </button>
        </form>
      </main>
    </div>
  )
}
