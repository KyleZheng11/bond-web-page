import { LocationInput } from '#/features/parties/components/LocationInput'
import { CUISINES, DIETARY } from '#/features/preferences/components/PreferenceSteps'

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="display text-3xl leading-tight">{title}</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
        {sub}
      </p>
    </div>
  )
}

export function StepUsername({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <StepHeading
        title="What should we call you?"
        sub="This is how you'll appear to others in your party."
      />
      <input
        type="text"
        placeholder="Your name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        maxLength={40}
        className="input text-base"
      />
    </div>
  )
}

export function StepDietaryOnboarding({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (d: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <StepHeading
        title="Any dietary restrictions?"
        sub="These are kept private — never shown to other party members."
      />
      <div className="flex flex-wrap gap-2">
        {DIETARY.map((d) => {
          const active = selected.includes(d)
          return (
            <button
              key={d}
              onClick={() => onToggle(d)}
              aria-pressed={active}
              className={`chip ${active ? 'chip-active' : ''}`}
            >
              {d}
            </button>
          )
        })}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
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
      <StepHeading
        title="Anything you'd never eat?"
        sub="These cuisines will never appear in your recommendations."
      />
      <div className="flex flex-wrap gap-2">
        {CUISINES.map((c) => {
          const isSelected = selected.includes(c)
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              aria-pressed={isSelected}
              className={`chip chip-danger ${isSelected ? 'chip-active' : ''}`}
            >
              {c}
            </button>
          )
        })}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
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
      <StepHeading
        title="Where do you usually eat?"
        sub="We'll search near here whenever you start a party."
      />
      <LocationInput value={value} onChange={onChange} />
      <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
        You can update this anytime from your profile.
      </p>
    </div>
  )
}
