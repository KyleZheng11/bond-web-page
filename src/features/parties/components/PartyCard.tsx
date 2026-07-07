import { useState } from 'react'
import { X } from 'lucide-react'
import type { Party, PartyStatus } from '#/features/parties'

const STATUS: Record<PartyStatus, { label: string; meta: string; bg: string; color: string }> = {
  open:      { label: 'Open',      meta: 'Waiting on the crew', bg: 'var(--color-surface-dim)',   color: 'var(--color-ink-soft)' },
  searching: { label: 'Searching', meta: 'Finding your spot',   bg: 'var(--color-sunrise-soft)',  color: 'var(--color-ember-text)' },
  voting:    { label: 'Voting',    meta: 'Voting in progress',  bg: 'var(--color-sunrise-soft)',  color: 'var(--color-ember-text)' },
  resolved:  { label: 'Resolved',  meta: 'All done',            bg: 'var(--color-success-soft)',  color: 'var(--color-success)' },
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
      className="glass w-full overflow-hidden transition-colors"
      style={confirming ? { borderColor: 'rgba(207,58,44,0.5)' } : undefined}
    >
      {/* Main row */}
      <div className="flex items-center">
        <button
          onClick={onClick}
          className="flex-1 text-left px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/25"
        >
          <div className="flex-1 min-w-0">
            {/* Name + status pill on the same row */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-bold text-lg leading-tight truncate" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
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
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
              {status.meta}
            </p>
          </div>
        </button>

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming((v) => !v) }}
            className="px-4 self-stretch flex items-center transition-opacity hover:opacity-70 cursor-pointer"
            style={{ color: confirming ? 'var(--color-error)' : 'var(--color-ink-faint)' }}
            aria-label="Delete party"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirming && (
        <div
          className="flex items-center justify-between px-5 py-3 gap-4 border-t"
          style={{ borderColor: 'rgba(207,58,44,0.3)', background: 'var(--color-error-soft)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Delete this party?
          </p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-70"
              style={{ background: 'var(--color-surface)', color: 'var(--color-ink-soft)', border: '1px solid var(--color-line)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-error)', color: '#ffffff' }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
