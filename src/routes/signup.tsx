import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useState } from 'react'
import {
  OAuthButton,
  EmailAuthForm,
  signInWithGoogle,
  signUpWithEmail,
} from '#/features/auth'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/home' })
  },
  component: SignUp,
})

function SignUp() {
  const navigate = useNavigate()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleGoogle() {
    setOauthLoading(true)
    const { error } = await signInWithGoogle()
    if (error) setOauthLoading(false)
    // on success the browser is redirected by Supabase — no manual nav needed
  }

  async function handleEmail(email: string, password: string) {
    setEmailError(null)
    const { data, error } = await signUpWithEmail(email, password)
    if (error) {
      setEmailError(error.message)
    } else if (!data.session) {
      // Supabase email confirmation is on — user exists but can't log in yet
      setEmailError('Check your email and click the confirmation link before logging in.')
    } else {
      navigate({ to: '/onboarding' })
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      {/* Back to welcome */}
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
        {/* Heading */}
        <div className="text-center">
          <h1
            className="font-display text-4xl font-bold mb-2 leading-tight"
            style={{ color: 'var(--color-text-cream)' }}
          >
            Join your people.
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            Create an account to start a party.
          </p>
        </div>

        {/* Social login — visually dominant, above the fold */}
        <div className="flex flex-col gap-3">
          <OAuthButton onClick={handleGoogle} loading={oauthLoading} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div
            className="flex-1 h-px"
            style={{ background: 'rgba(240,228,204,0.08)' }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-mist)' }}>
            or continue with email
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'rgba(240,228,204,0.08)' }}
          />
        </div>

        {/* Email / password fallback */}
        <EmailAuthForm mode="signup" onSubmit={handleEmail} error={emailError} />

        {/* Log in link */}
        <p className="text-center text-sm" style={{ color: 'var(--color-text-mist)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-cream)' }}
          >
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
