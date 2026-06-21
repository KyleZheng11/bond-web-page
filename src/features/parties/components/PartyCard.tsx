import { useState } from 'react'
import type { Party, PartyStatus } from '#/features/parties'

const STATUS: Record<PartyStatus, { label: string; color: string }> = {
  open:      { label: 'Waiting for friends', color: 'var(--color-accent-gold)' },
  searching: { label: 'Finding your spot',   color: 'var(--color-accent-ember)' },
  voting:    { label: 'Vote now',            color: 'var(--color-accent-ember)' },
  resolved:  { label: 'All done',            color: 'var(--color-accent-aurora)' },
}

export function PartyCard({
  party,
  onClick,
  onDelete,
}: {
  party: Party
  onClick?: () => void
  onDelete?: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = STATUS[party.status as PartyStatus] ?? STATUS.open
  const date = new Date(party.created_at!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div
      className="w-full rounded-2xl overflow-hidden transition-colors"
      style={{
        background: 'var(--color-surface-petrol)',
        border: `1px solid ${confirming ? 'rgba(180,46,28,0.4)' : 'rgba(240,228,204,0.06)'}`,
      }}
    >
      {/* Main row */}
      <div className="flex items-center">
        <button
          onClick={onClick}
          className="flex-1 text-left p-5 flex items-center gap-4 hover:brightness-110 transition-all"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: status.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--color-text-cream)' }}>
              {party.name ?? `Party · ${date}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-mist)' }}>
              {status.label}
            </p>
          </div>
          <span className="text-sm shrink-0" style={{ color: 'var(--color-text-mist)' }}>→</span>
        </button>

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming((v) => !v) }}
            className="px-4 py-5 text-lg transition-opacity hover:opacity-70"
            style={{ color: confirming ? 'var(--color-accent-brick)' : 'var(--color-text-mist)' }}
            aria-label="Delete party"
          >
            ×
          </button>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirming && (
        <div
          className="flex items-center justify-between px-5 py-3 gap-4 border-t"
          style={{ borderColor: 'rgba(180,46,28,0.3)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            Delete this party?
          </p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-mist)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-accent-brick)', color: 'var(--color-on-brick)' }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
