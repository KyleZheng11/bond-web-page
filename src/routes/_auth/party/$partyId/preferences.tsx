import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '#/features/auth'
import { getLeaderPrefsContext, submitPreferences } from '#/features/preferences'
import { StepCuisine, StepBudget, StepVibe, StepDietary } from '#/features/preferences/components/PreferenceSteps'

export const Route = createFileRoute('/_auth/party/$partyId/preferences')({ component: Preferences })

function Preferences() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [initializing, setInitializing] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [showDietaryStep, setShowDietaryStep] = useState(true)
  const totalSteps = showDietaryStep ? 4 : 3

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  const [cuisineVetoes, setCuisineVetoes] = useState<string[]>([])
  const [budget, setBudget] = useState<number | null>(null)
  const [vibe, setVibe] = useState<string | null>(null)
  const [dietary, setDietary] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    getLeaderPrefsContext({ data: { userId: user.id } })
      .then(({ profileDietaryRestrictions }) => {
        if (profileDietaryRestrictions.length > 0) setShowDietaryStep(false)
      })
      .finally(() => setInitializing(false))
  }, [user])

  function goBack() {
    if (step === 1) {
      navigate({ to: '/party/$partyId/lobby', params: { partyId } })
      return
    }
    setDirection(-1)
    setStep((s) => s - 1)
  }

  function goNext() {
    setDirection(1)
    setStep((s) => s + 1)
  }

  async function handleSubmit() {
    if (!user || budget === null) return
    setSubmitting(true)
    setError('')
    try {
      await submitPreferences({
        data: { partyId, userId: user.id, cuisineVetoes, budgetTier: budget, vibe, dietaryRestrictions: dietary },
      })
      navigate({ to: '/party/$partyId/lobby', params: { partyId } })
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function handleContinue() {
    if (step < totalSteps) goNext()
    else handleSubmit()
  }

  function toggleCuisine(c: string) {
    setCuisineVetoes((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function toggleDietary(d: string) {
    setDietary((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  const canContinue =
    step === 1 ? true :
    step === 2 ? budget !== null :
    true

  const continueLabel = step === totalSteps
    ? submitting ? 'Saving…' : 'Done'
    : 'Continue'

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-deep)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-accent-ember)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

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
          {Array.from({ length: totalSteps }).map((_, i) => (
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
          {step} / {totalSteps}
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
            {step === 1 && <StepCuisine vetoes={cuisineVetoes} onToggle={toggleCuisine} />}
            {step === 2 && <StepBudget selected={budget} onSelect={setBudget} />}
            {step === 3 && <StepVibe selected={vibe} onSelect={setVibe} />}
            {step === 4 && showDietaryStep && <StepDietary selected={dietary} onToggle={toggleDietary} />}
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
