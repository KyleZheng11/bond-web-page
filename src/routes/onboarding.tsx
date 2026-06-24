import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { supabase } from '#/lib/supabase'
import { updateUserProfile } from '#/features/auth'
import {
  StepDietaryOnboarding,
  StepNeverCuisines,
  StepLocation,
} from '#/features/auth/components/OnboardingSteps'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/welcome' })
    // Skip onboarding if location is already set
    const { data: profile } = await supabase
      .from('users')
      .select('location')
      .eq('id', data.session.user.id)
      .maybeSingle()
    if (profile?.location) throw redirect({ to: '/home' })
  },
  component: Onboarding,
})

const STEPS = 3

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dietary, setDietary] = useState<string[]>([])
  const [neverCuisines, setNeverCuisines] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDietary(d: string) {
    setDietary((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function toggleNever(c: string) {
    setNeverCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  async function handleNext() {
    if (step < STEPS - 1) {
      setStep((s) => s + 1)
      return
    }
    if (!location.trim()) return
    setSaving(true)
    setError(null)
    let saved = false
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      await updateUserProfile({
        data: {
          userId: session.user.id,
          location: location.trim(),
          dietary_restrictions: dietary,
          cuisine_blacklist: neverCuisines,
        },
      })
      saved = true
    } catch (e) {
      console.error('Onboarding save error:', e)
      setError('Something went wrong, try again.')
      setSaving(false)
    }
    if (saved) navigate({ to: '/home' })
  }

  const canProceed = step < STEPS - 1 || location.trim().length > 0

  return (
    <div
      className="min-h-screen flex flex-col px-6 py-12"
      style={{ background: 'var(--color-surface-deep)' }}
    >
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-10">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i <= step ? 'var(--color-accent-ember)' : 'rgba(240,228,204,0.12)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <StepDietaryOnboarding selected={dietary} onToggle={toggleDietary} />
            )}
            {step === 1 && (
              <StepNeverCuisines selected={neverCuisines} onToggle={toggleNever} />
            )}
            {step === 2 && (
              <StepLocation value={location} onChange={setLocation} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--color-accent-brick)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleNext}
        disabled={!canProceed || saving}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-all disabled:opacity-40"
        style={{
          background: 'var(--color-accent-ember)',
          color: 'var(--color-on-ember)',
        }}
      >
        {saving ? 'Saving…' : step === STEPS - 1 ? 'Start using Bond' : 'Next'}
      </button>
    </div>
  )
}
