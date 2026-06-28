export const CUISINES = [
  // Top picks — shown before "view more"
  'American', 'Chinese', 'Italian', 'Mexican', 'Japanese', 'Thai', 'Indian', 'Korean', 'Pizza', 'Sushi', 'BBQ', 'Mediterranean',
  // Everything else — alphabetical
  'Afghani', 'African', 'Argentinian', 'Australian', 'Austrian',
  'Bangladeshi', 'Basque', 'Bavarian', 'Belgian', 'Brazilian', 'Breakfast & Brunch', 'British', 'Burgers', 'Burmese',
  'Cajun & Southern', 'Californian', 'Cambodian', 'Cantonese', 'Caribbean', 'Chilean',
  'Chinese Noodles', 'Colombian', 'Croatian', 'Cuban', 'Czech',
  'Danish', 'Dim Sum', 'Dutch',
  'Eastern European', 'Ethiopian',
  'Filipino', 'French',
  'German', 'Greek',
  'Hawaiian', 'Hot Pot', 'Hungarian',
  'Indonesian', 'Irish', 'Israeli',
  'Japanese Curry', 'Japanese Izakaya',
  'Korean BBQ',
  'Latin American', 'Lebanese',
  'Malaysian', 'Middle Eastern', 'Mongolian BBQ', 'Moroccan',
  'North Indian',
  'Pakistani', 'Persian', 'Peruvian', 'Polish', 'Portuguese',
  'Ramen', 'Romanian', 'Russian',
  'Sandwiches & Deli', 'Scandinavian', 'Seafood', 'Soul Food', 'South American', 'South Indian', 'Southwestern', 'Spanish', 'Sri Lankan', 'Steakhouse', 'Swiss',
  'Taiwanese', 'Tapas', 'Tex-Mex', 'Tibetan', 'Tonkatsu', 'Turkish',
  'Ukrainian',
  'Vegan', 'Vegetarian', 'Vietnamese',
  'Yakiniku', 'Yakitori',
]

export const BUDGETS = [
  { tier: 1, symbol: '$', label: 'Under $15', sub: 'per person' },
  { tier: 2, symbol: '$$', label: '$15 – 30', sub: 'per person' },
  { tier: 3, symbol: '$$$', label: '$30 – 60', sub: 'per person' },
  { tier: 4, symbol: '$$$$', label: '$60+', sub: 'per person' },
]

export const DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-free',
  'Halal', 'Kosher', 'Dairy-free',
]

// ── Step components ───────────────────────────────────────────────────────────

export function StepCuisine({
  wants,
  onToggle,
  blacklist = [],
}: {
  wants: string[]
  onToggle: (c: string) => void
  blacklist?: string[]
}) {
  const available = CUISINES.filter((c) => !blacklist.includes(c))

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1
          className="font-display text-3xl font-black leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          What are you in the mood for?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          Pick as many as you like. Nothing selected means you're open to anything.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {available.map((c) => {
          const selected = wants.includes(c)
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: selected ? 'var(--color-accent-ember)' : 'var(--color-surface-petrol)',
                color: selected ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                border: `1px solid ${selected ? 'transparent' : 'var(--color-hairline)'}`,
              }}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StepBudget({
  selected,
  onSelect,
}: {
  selected: number | null
  onSelect: (t: number) => void
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1
          className="font-display text-3xl font-black leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          What's your budget?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          Pick what feels right for tonight.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {BUDGETS.map(({ tier, symbol, label, sub }) => {
          const active = selected === tier
          return (
            <button
              key={tier}
              onClick={() => onSelect(tier)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
              style={{
                background: active ? 'var(--color-accent-ember)' : 'var(--color-surface-petrol)',
                color: active ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                border: `1px solid ${active ? 'transparent' : 'var(--color-hairline)'}`,
              }}
            >
              <span className="font-display text-xl font-bold w-14 shrink-0">{symbol}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-70">{sub}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StepDietary({
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
          className="font-display text-3xl font-black leading-tight"
          style={{ color: 'var(--color-text-cream)' }}
        >
          Any dietary restrictions?
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-mist)' }}>
          These are never shown to other members of your party.
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
                border: `1px solid ${active ? 'transparent' : 'var(--color-hairline)'}`,
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
