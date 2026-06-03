import type { Party, PartyStatus } from '#/features/parties'

const STATUS: Record<PartyStatus, { label: string; color: string }> = {
  open:      { label: 'Waiting for friends', color: 'var(--color-accent-gold)' },
  searching: { label: 'Finding your spot',   color: 'var(--color-accent-ember)' },
  resolved:  { label: 'All done',            color: 'var(--color-accent-aurora)' },
}

export function PartyCard({ party, onClick }: { party: Party; onClick?: () => void }) {
  const status = STATUS[party.status as PartyStatus] ?? STATUS.open
  const date = new Date(party.created_at!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-colors hover:brightness-110"
      style={{
        background: 'var(--color-surface-petrol)',
        border: '1px solid rgba(240,228,204,0.06)',
      }}
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
      <span className="text-sm" style={{ color: 'var(--color-text-mist)' }}>→</span>
    </button>
  )
}
