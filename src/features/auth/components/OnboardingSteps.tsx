import { LocationInput } from '#/features/parties/components/LocationInput'
import { CUISINES, DIETARY } from '#/features/preferences/components/PreferenceSteps'

export function StepDietaryOnboarding({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (d: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1
          className="font-display text-3xl font-semibold leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          Any dietary restrictions?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          These are kept private — never shown to other party members.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETARY.map((d) => {
          const active = selected.includes(d)
          return (
            <button
              key={d}
              onClick={() => onToggle(d)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--color-accent-ember)' : 'var(--color-surface-petrol)',
                color: active ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                border: `1px solid ${active ? 'transparent' : 'rgba(240,228,204,0.08)'}`,
              }}
            >
              {d}
            </button>
          )
        })}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
        Nothing selected = no restrictions.
      </p>
    </div>
  )
}

export function StepNeverCuisines({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (c: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1
          className="font-display text-3xl font-semibold leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          Anything you'd never eat?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          These cuisines will never appear in your recommendations.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CUISINES.map((c) => {
          const isSelected = selected.includes(c)
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: isSelected ? 'var(--color-accent-brick)' : 'var(--color-surface-petrol)',
                color: isSelected ? 'var(--color-on-brick)' : 'var(--color-text-cream)',
                border: `1px solid ${isSelected ? 'transparent' : 'rgba(240,228,204,0.08)'}`,
              }}
            >
              {c}
            </button>
          )
        })}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
        Nothing selected = you're open to everything.
      </p>
    </div>
  )
}

export function StepLocation({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1
          className="font-display text-3xl font-semibold leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          Where do you usually eat?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          We'll search near here whenever you start a party.
        </p>
      </div>
      <LocationInput value={value} onChange={onChange} />
      <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
        You can update this anytime from your profile.
      </p>
    </div>
  )
}
