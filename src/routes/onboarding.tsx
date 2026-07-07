import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '#/lib/supabase'
import { updateUserProfile } from '#/features/auth'
import {
  StepUsername,
  StepDietaryOnboarding,
  StepNeverCuisines,
  StepLocation,
} from '#/features/auth/components/OnboardingSteps'
import { Wordmark } from '#/components/ui'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/welcome' })
    // Skip onboarding only when both display_name and location are already set
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, location')
      .eq('id', data.session.user.id)
      .maybeSingle()
    if (profile?.display_name?.trim() && profile?.location) throw redirect({ to: '/home' })
  },
  component: Onboarding,
})

const STEPS = 4

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
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
          display_name: username.trim(),
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

  const canProceed =
    (step === 0 && username.trim().length > 0) ||
    (step === 1) ||
    (step === 2) ||
    (step === 3 && location.trim().length > 0)

  return (
    <div className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto w-full">
      {/* Header: back within steps + wordmark */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 text-sm font-semibold min-h-11 transition-opacity hover:opacity-70 disabled:opacity-0 disabled:pointer-events-none"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          <ArrowLeft size={16} aria-hidden />
          Back
        </button>
        <Wordmark className="text-xl" />
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2 mb-10">
        <p className="eyebrow">Step {step + 1} of {STEPS}</p>
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? 'var(--color-sunrise)' : 'var(--color-line)' }}
            />
          ))}
        </div>
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
              <StepUsername value={username} onChange={setUsername} />
            )}
            {step === 1 && (
              <StepDietaryOnboarding selected={dietary} onToggle={toggleDietary} />
            )}
            {step === 2 && (
              <StepNeverCuisines selected={neverCuisines} onToggle={toggleNever} />
            )}
            {step === 3 && (
              <StepLocation value={location} onChange={setLocation} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="text-sm mb-4 text-center" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleNext}
        disabled={!canProceed || saving}
        className="btn btn-primary w-full py-4 text-base"
      >
        {saving ? 'Saving…' : step === STEPS - 1 ? 'Start using Bond' : 'Next'}
      </button>
    </div>
  )
}
