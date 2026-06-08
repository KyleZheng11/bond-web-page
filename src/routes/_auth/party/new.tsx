import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '#/features/auth'
import { createParty, sendInvites, PhoneInput, LocationInput } from '#/features/parties'

export const Route = createFileRoute('/_auth/party/new')({ component: NewParty })

function NewParty() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [phones, setPhones] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      if (phones.length > 0) {
        await sendInvites({ data: { partyId: party.id, phoneNumbers: phones } })
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
        <span
          className="font-display text-xl font-semibold"
          style={{ color: 'var(--color-accent-gold)' }}
        >
          Bond
        </span>
      </header>

      {/* Form */}
      <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full">
        <h1
          className="font-display text-3xl font-semibold mb-2"
          style={{ color: 'var(--color-text-cream)' }}
        >
          Start a party.
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-mist)' }}>
          Invite your crew and let Bond find the perfect spot.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Party name */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-mist)' }}
            >
              Party name{' '}
              <span style={{ color: 'var(--color-text-mist)', fontWeight: 400 }}>(optional)</span>
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
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-mist)' }}
            >
              Location <span style={{ color: 'var(--color-accent-brick)' }}>*</span>
            </label>
            <LocationInput value={location} onChange={setLocation} />
          </div>

          {/* Phone numbers */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-mist)' }}
            >
              Invite by phone
            </label>
            <PhoneInput phones={phones} onChange={setPhones} />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-accent-brick)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{
              background: 'var(--color-accent-ember)',
              color: 'var(--color-on-ember)',
            }}
          >
            {loading ? 'Creating…' : phones.length > 0 ? 'Send invites' : 'Create party'}
          </button>
        </form>
      </main>
    </div>
  )
}
