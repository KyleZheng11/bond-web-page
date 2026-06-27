export function PartyProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex gap-1.5 mt-3">
      {([1, 2, 3, 4] as const).map((s) => (
        <div
          key={s}
          className="flex-1 h-1 rounded-full transition-colors"
          style={{ background: s <= step ? 'var(--color-accent-ember)' : 'var(--color-hairline)' }}
        />
      ))}
    </div>
  )
}
