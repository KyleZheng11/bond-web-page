const STEP_LABELS = ['Set up', 'Gather', 'Vote', 'Eat'] as const

export function PartyProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mt-3">
      <div className="flex gap-1.5">
        {([1, 2, 3, 4] as const).map((s) => (
          <div
            key={s}
            className="flex-1 h-1.5 rounded-full transition-colors"
            style={{ background: s <= step ? 'var(--color-sunrise)' : 'var(--color-line)' }}
          />
        ))}
      </div>
      <p className="eyebrow mt-2" style={{ color: 'var(--color-ink-faint)' }}>
        {STEP_LABELS[step - 1]}
      </p>
    </div>
  )
}
