import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/auth/callback')({ component: AuthCallback })

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate({ to: '/home' })
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
        Signing you in…
      </p>
    </div>
  )
}
