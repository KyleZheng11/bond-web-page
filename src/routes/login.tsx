import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  OAuthButton,
  EmailAuthForm,
  signInWithGoogle,
  signInWithEmail,
} from '#/features/auth'
import { supabase } from '#/lib/supabase'
import { Wordmark } from '#/components/ui'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/home' })
  },
  component: LogIn,
})

function LogIn() {
  const navigate = useNavigate()
  const { returnTo } = Route.useSearch()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleGoogle() {
    setOauthLoading(true)
    if (returnTo) localStorage.setItem('bond:returnTo', returnTo)
    const { error } = await signInWithGoogle()
    if (error) {
      localStorage.removeItem('bond:returnTo')
      setOauthLoading(false)
    }
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
      navigate({ to: (returnTo ?? '/home') as '/' })
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-6">
      <div className="w-full max-w-sm flex items-center justify-between">
        <button
          onClick={() => navigate({ to: (returnTo ?? '/welcome') as '/' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold min-h-11 transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          <ArrowLeft size={16} aria-hidden />
          Back
        </button>
        <Link to="/" aria-label="Bond home">
          <Wordmark className="text-xl" />
        </Link>
      </div>

      <motion.div
        className="w-full max-w-sm my-auto py-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="card p-8 flex flex-col gap-7">
          <div>
            <h1 className="display text-3xl mb-2">Welcome back.</h1>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Log in to see your parties.
            </p>
          </div>

          <OAuthButton onClick={handleGoogle} loading={oauthLoading} />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
              or continue with email
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>

          <EmailAuthForm mode="login" onSubmit={handleEmail} error={emailError} />
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-ink-soft)' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            search={{ returnTo }}
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-blueberry)' }}
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
