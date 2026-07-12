import { useState } from 'react'

interface EmailAuthFormProps {
  mode: 'signup' | 'login'
  onSubmit: (email: string, password: string) => Promise<void>
  error?: string | null
  // Success-styled message (e.g. "check your email") — errors turn red, this doesn't
  notice?: string | null
}

export function EmailAuthForm({ mode, onSubmit, error, notice }: EmailAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(email, password)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="auth-email" className="field-label">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="field-label">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm px-4 py-3 rounded-xl" style={{ background: 'var(--color-error-soft)', color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="text-sm px-4 py-3 rounded-xl" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
          {notice}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5 mt-1">
        {loading ? 'Just a sec…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </form>
  )
}
