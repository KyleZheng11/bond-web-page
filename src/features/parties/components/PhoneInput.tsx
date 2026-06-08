import { useState } from 'react'

interface PhoneInputProps {
  phones: string[]
  onChange: (phones: string[]) => void
}

function format(digits: string) {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function PhoneInput({ phones, onChange }: PhoneInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function add() {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit number')
      return
    }
    if (phones.includes(digits)) {
      setError('Already added')
      return
    }
    onChange([...phones, digits])
    setValue('')
    setError('')
  }

  function remove(phone: string) {
    onChange(phones.filter((p) => p !== phone))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="tel"
          placeholder="(555) 000-0000"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface-twilight)',
            border: '1px solid rgba(240,228,204,0.08)',
            color: 'var(--color-text-cream)',
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-surface-twilight)',
            color: 'var(--color-text-cream)',
          }}
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-accent-brick)' }}>
          {error}
        </p>
      )}

      {phones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {phones.map((p) => (
            <span
              key={p}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: 'var(--color-surface-petrol)',
                color: 'var(--color-text-cream)',
              }}
            >
              {format(p)}
              <button
                type="button"
                onClick={() => remove(p)}
                className="transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-text-mist)' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
