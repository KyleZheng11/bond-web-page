import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useState } from 'react'
import {
  OAuthButton,
  EmailAuthForm,
  signInWithGoogle,
  signInWithEmail,
} from '#/features/auth'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/home' })
  },
  component: LogIn,
})

function LogIn() {
  const navigate = useNavigate()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleGoogle() {
    setOauthLoading(true)
    const { error } = await signInWithGoogle()
    if (error) setOauthLoading(false)
  }

  async function handleEmail(email: string, password: string) {
    setEmailError(null)
    const { error } = await signInWithEmail(email, password)
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setEmailError('Please confirm your email first — check your inbox for the link we sent.')
      } else {
        setEmailError('Incorrect email or password.')
      }
    } else {
      navigate({ to: '/home' })
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      <Link
        to="/welcome"
        className="absolute left-6 text-sm font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-mist)', top: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        ← Back
      </Link>

      <motion.div
        className="w-full max-w-sm flex flex-col gap-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="text-center">
          <h1
            className="font-display text-4xl font-bold mb-2 leading-tight"
            style={{ color: 'var(--color-text-cream)' }}
          >
            Welcome back.
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            Log in to see your parties.
          </p>
        </div>

        <OAuthButton onClick={handleGoogle} loading={oauthLoading} />

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(240,228,204,0.08)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-mist)' }}>
            or continue with email
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,228,204,0.08)' }} />
        </div>

        <EmailAuthForm mode="login" onSubmit={handleEmail} error={emailError} />

        <p className="text-center text-sm" style={{ color: 'var(--color-text-mist)' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-cream)' }}
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
