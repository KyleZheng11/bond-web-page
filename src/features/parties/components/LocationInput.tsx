import { useState } from 'react'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const [detecting, setDetecting] = useState(false)

  function detectLocation() {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          )
          const data = await res.json()
          const city =
            data.address?.city ?? data.address?.town ?? data.address?.village ?? ''
          const state = data.address?.state ?? ''
          onChange(city && state ? `${city}, ${state}` : city || state)
        } catch {
          // reverse geocode failed — user can type manually
        } finally {
          setDetecting(false)
        }
      },
      () => setDetecting(false),
    )
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="City or neighborhood"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          background: 'var(--color-surface-twilight)',
          border: '1px solid rgba(240,228,204,0.08)',
          color: 'var(--color-text-cream)',
        }}
      />
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-opacity disabled:opacity-50 hover:opacity-80"
        style={{
          background: 'var(--color-surface-twilight)',
          color: 'var(--color-text-mist)',
        }}
      >
        {detecting ? 'Detecting…' : '📍 Use location'}
      </button>
    </div>
  )
}
