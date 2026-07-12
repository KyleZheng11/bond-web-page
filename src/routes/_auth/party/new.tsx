import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useAuth, getUserProfile } from '#/features/auth'
import { createParty, inviteFriends, LocationInput, PartyProgressBar } from '#/features/parties'
import { getFriends } from '#/features/friends'
import type { Friend } from '#/features/friends'
import { AppHeader, Avatar, ShinyButton } from '#/components/ui'

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
    getUserProfile().then((p) => {
      if (p.location) setLocation(p.location)
    })
    getFriends().then(setFriends)
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
        },
      })

      if (selectedFriendIds.size > 0) {
        await inviteFriends({ data: { partyId: party.id, friendUserIds: [...selectedFriendIds] } })
      }

      navigate({ to: '/party/$partyId/hub', params: { partyId: party.id } })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="max-w-lg mx-auto w-full">
        <AppHeader backTo="/home" />
        <div className="px-6">
          <PartyProgressBar step={1} />
        </div>
      </div>

      <main className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">
        <h1 className="display text-3xl mb-2">Start a party.</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-ink-soft)' }}>
          Invite your crew and let Bond find the perfect spot.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Party name */}
          <div>
            <label htmlFor="party-name" className="field-label">
              Party name <span style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="party-name"
              type="text"
              placeholder="Saturday Night, Team Lunch…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          {/* Location */}
          <div>
            <label className="field-label">
              Location <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <LocationInput value={location} onChange={setLocation} />
          </div>

          {/* Friends picker */}
          {friends.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="field-label !mb-0">Invite friends</p>
              <div className="flex flex-col gap-2">
                {friends.map((friend) => {
                  const selected = selectedFriendIds.has(friend.userId)
                  return (
                    <button
                      key={friend.userId}
                      type="button"
                      onClick={() => toggleFriend(friend.userId)}
                      aria-pressed={selected}
                      className="card flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors"
                      style={selected ? { borderColor: 'var(--color-bond)', background: '#f2f8fb' } : undefined}
                    >
                      <Avatar name={friend.displayName ?? friend.email} size="sm" />
                      <span className="flex-1 text-sm font-medium truncate">
                        {friend.displayName ?? friend.email.split('@')[0]}
                      </span>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                        style={
                          selected
                            ? { background: 'var(--color-bond)', color: '#ffffff' }
                            : { border: '1.5px solid var(--color-line)' }
                        }
                        aria-hidden
                      >
                        {selected && <Check size={14} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <ShinyButton type="submit" disabled={loading} className="w-full mt-2">
            {loading
              ? 'Creating…'
              : selectedFriendIds.size > 0
              ? `Invite friends (${selectedFriendIds.size})`
              : 'Create party'}
          </ShinyButton>
        </form>
      </main>
    </div>
  )
}
