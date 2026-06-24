import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { submitGuestPreferences } from '#/features/invites'
import { StepCuisine, StepBudget, StepDietary } from '#/features/preferences/components/PreferenceSteps'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/invite/$token/preferences')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
  }),
  component: GuestPreferences,
})

const TOTAL_STEPS = 3

function GuestPreferences() {
  const { token } = Route.useParams()
  const { name } = Route.useSearch()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [cuisineWants, setCuisineWants] = useState<string[]>([])
  const [budget, setBudget] = useState<number | null>(null)
  const [dietary, setDietary] = useState<string[]>([])

  function goBack() {
    if (step === 1) {
      navigate({ to: '/invite/$token', params: { token } })
      return
    }
    setDirection(-1)
    setStep((s) => s - 1)
  }

  async function handleSubmit() {
    if (budget === null) return
    setSubmitting(true)
    setError('')
    try {
      const result = await submitGuestPreferences({
        data: { token, guestName: name, cuisineWants, budgetTier: budget, dietaryRestrictions: dietary },
      })
      // Broadcast so the leader's lobby updates in real-time
      const ch = supabase.channel(`lobby:${result.partyId}`)
      await ch.send({ type: 'broadcast', event: 'member_updated', payload: {} })
      supabase.removeChannel(ch)
      navigate({ to: '/invite/$token/lobby', params: { token } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function handleContinue() {
    if (step < TOTAL_STEPS) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      handleSubmit()
    }
  }

  function toggleCuisine(c: string) {
    setCuisineWants((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function toggleDietary(d: string) {
    setDietary((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  const canContinue = step === 2 ? budget !== null : true
  const continueLabel = step === TOTAL_STEPS
    ? submitting ? 'Saving…' : 'Done'
    : 'Continue'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="flex items-center justify-between px-6 py-5 shrink-0">
        <button
          onClick={goBack}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i + 1 === step ? 20 : 8,
                height: 8,
                background:
                  i + 1 === step ? 'var(--color-accent-ember)' :
                  i + 1 < step ? 'var(--color-accent-gold)' :
                  'var(--color-surface-twilight)',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-mist)' }}>
          {step} / {TOTAL_STEPS}
        </span>
      </header>

      <div className="flex-1 overflow-hidden px-6 pb-6 max-w-lg mx-auto w-full flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="flex-1 flex flex-col"
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {step === 1 && <StepCuisine wants={cuisineWants} onToggle={toggleCuisine} />}
            {step === 2 && <StepBudget selected={budget} onSelect={setBudget} />}
            {step === 3 && <StepDietary selected={dietary} onToggle={toggleDietary} />}
          </motion.div>
        </AnimatePresence>

        <div className="shrink-0 flex flex-col gap-3 pt-4">
          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--color-accent-brick)' }}>{error}</p>
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue || submitting}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
            style={{
              background: canContinue ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
              color: canContinue ? 'var(--color-on-ember)' : 'var(--color-text-mist)',
              opacity: canContinue && !submitting ? 1 : 0.5,
              cursor: canContinue && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
