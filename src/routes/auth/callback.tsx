import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '#/lib/supabase'
import { Spinner } from '#/components/ui'

export const Route = createFileRoute('/auth/callback')({ component: AuthCallback })

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const returnTo = localStorage.getItem('bond:returnTo')
        localStorage.removeItem('bond:returnTo')
        if (returnTo) {
          navigate({ to: returnTo as '/' })
          return
        }
        const { data: profile } = await supabase
          .from('users')
          .select('location')
          .eq('id', session.user.id)
          .maybeSingle()
        navigate({ to: profile?.location ? '/home' : '/onboarding' })
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <Spinner size={32} />
      <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
        Signing you in…
      </p>
    </div>
  )
}
