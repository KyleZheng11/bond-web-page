import { useState } from 'react'
import { motion } from 'motion/react'

interface EmailAuthFormProps {
  mode: 'signup' | 'login'
  onSubmit: (email: string, password: string) => Promise<void>
  error?: string | null
}

export function EmailAuthForm({ mode, onSubmit, error }: EmailAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(email, password)
    setLoading(false)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2'

  const inputStyle = {
    background: 'var(--color-surface-twilight)',
    border: '1px solid rgba(240,228,204,0.08)',
    color: 'var(--color-text-cream)',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--color-accent-brick)' }}>
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-2xl font-bold text-sm mt-1 disabled:opacity-50 transition-opacity"
        style={{
          background: 'var(--color-accent-ember)',
          color: 'var(--color-on-ember)',
        }}
      >
        {loading ? 'Just a sec…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </motion.button>
    </form>
  )
}
