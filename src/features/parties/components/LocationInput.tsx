import { useState, useRef, useEffect, useCallback } from 'react'
import { autocompleteLocation } from '../api/autocompleteLocation'
import type { LocationSuggestion } from '../api/autocompleteLocation'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const [detecting, setDetecting] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.trim().length < 2) { setSuggestions([]); setOpen(false); return }
    setFetching(true)
    try {
      const results = await autocompleteLocation({ data: { input } })
      setSuggestions(results)
      setOpen(results.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setFetching(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 320)
  }

  function select(s: LocationSuggestion) {
    onChange(s.text)
    setSuggestions([])
    setOpen(false)
  }

  async function detectLocation() {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          )
          const data = await res.json()
          const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? ''
          const state = data.address?.state ?? ''
          onChange(city && state ? `${city}, ${state}` : city || state)
          setSuggestions([])
          setOpen(false)
        } catch {
          // reverse geocode failed — user can still type manually
        } finally {
          setDetecting(false)
        }
      },
      () => setDetecting(false),
    )
  }

  return (
    <div ref={containerRef} className="flex gap-2">
      {/* Input + dropdown wrapper */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="City, neighborhood, or address"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface-twilight)',
            border: '1px solid rgba(240,228,204,0.08)',
            color: 'var(--color-text-cream)',
          }}
        />

        {/* Spinner */}
        {fetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(143,168,181,0.3)', borderTopColor: 'var(--color-text-mist)' }}
            />
          </div>
        )}

        {/* Suggestions dropdown */}
        {open && suggestions.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50 shadow-xl"
            style={{
              background: 'var(--color-surface-twilight)',
              border: '1px solid rgba(240,228,204,0.12)',
            }}
          >
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  // onMouseDown instead of onClick so it fires before the input's onBlur
                  onMouseDown={(e) => { e.preventDefault(); select(s) }}
                  className="w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors hover:brightness-125"
                  style={{
                    borderBottom:
                      i < suggestions.length - 1 ? '1px solid rgba(240,228,204,0.06)' : 'none',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-cream)' }}>
                    {s.mainText}
                  </span>
                  {s.secondaryText && (
                    <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                      {s.secondaryText}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GPS detect button */}
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
