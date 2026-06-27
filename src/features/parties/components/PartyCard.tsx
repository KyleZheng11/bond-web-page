import { useState } from 'react'
import type { Party, PartyStatus } from '#/features/parties'

const STATUS: Record<PartyStatus, { label: string; meta: string; bg: string; color: string }> = {
  open:      { label: 'Open',      meta: 'Waiting on the crew',    bg: '#F1ECE2', color: '#8A7F72' },
  searching: { label: 'Searching', meta: 'Finding your spot',      bg: '#FFE9DF', color: '#FF5B22' },
  voting:    { label: 'Voting',    meta: 'Voting in progress',     bg: '#FFE9DF', color: '#FF5B22' },
  resolved:  { label: 'Resolved',  meta: 'All done',               bg: '#E6F5EC', color: '#1FA85C' },
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

  const status = STATUS[party.status]
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
        border: `1px solid ${confirming ? 'rgba(215,55,42,0.4)' : 'var(--color-hairline)'}`,
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      }}
    >
      {/* Main row */}
      <div className="flex items-center">
        <button
          onClick={onClick}
          className="flex-1 text-left px-5 py-4 flex items-center gap-3 hover:brightness-[0.97] transition-all"
        >
          <div className="flex-1 min-w-0">
            {/* Name + status pill on the same row */}
            <div className="flex items-start justify-between gap-2">
              <p
                className="font-display font-black text-lg leading-tight truncate"
                style={{ color: 'var(--color-text-cream)', letterSpacing: '-0.01em' }}
              >
                {party.name ?? `Party · ${date}`}
              </p>
              <span
                className="shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-0.5"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label}
              </span>
            </div>
            {/* Meta line */}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-mist)' }}>
              {status.meta}
            </p>
          </div>
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
          style={{ borderColor: 'rgba(215,55,42,0.3)' }}
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
