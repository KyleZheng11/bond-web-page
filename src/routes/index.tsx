import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useForm } from '@tanstack/react-form'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import Select from 'react-select'

export const Route = createFileRoute('/')({ component: Home })

// ─── react-select custom styles ────────────────────────────────────────────
// react-select doesn't use regular CSS classes — it has its own CSS-in-JS
// "styles" prop where each sub-component slot is a function:
//   (base, state) => ({ ...base, ...overrides })
// We spread `base` first so we only override what we need.
const selectStyles = {
  // The visible input box
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    background: 'var(--color-surface-card)',
    border: state.isFocused
      ? '1px solid var(--color-accent-electric)'
      : '1px solid var(--color-surface-slate)',
    borderRadius: '0.75rem',       // matches rounded-xl on your other inputs
    padding: '4px 4px',
    boxShadow: state.isFocused ? '0 0 0 2px var(--color-accent-electric)' : 'none',
    '&:hover': { borderColor: 'var(--color-accent-electric)' },
  }),

  // The dropdown panel that appears
  menu: (base: object) => ({
    ...base,
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-surface-slate)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
  }),

  // The scrollable list inside the panel
  menuList: (base: object) => ({
    ...base,
    padding: 0,
  }),

  // Each individual option row
  option: (base: object, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    background: state.isSelected
      ? 'var(--color-accent-electric)'        // selected  → electric highlight
      : state.isFocused
        ? 'var(--color-surface-slate)'        // hovered   → subtle slate
        : 'transparent',                       // default   → transparent
    color: state.isSelected ? '#000' : 'var(--color-text-cream)',
    cursor: 'pointer',
  }),

  // The chosen value displayed in the control
  singleValue: (base: object) => ({
    ...base,
    color: 'var(--color-text-cream)',
  }),

  // Placeholder text
  placeholder: (base: object) => ({
    ...base,
    color: 'var(--color-text-muted)',
  }),

  // The text cursor / search input inside the control
  input: (base: object) => ({
    ...base,
    color: 'var(--color-text-cream)',
  }),

  // The little divider line between the value and the arrow icon
  indicatorSeparator: (base: object) => ({
    ...base,
    background: 'var(--color-surface-slate)',
  }),

  // The dropdown arrow icon
  dropdownIndicator: (base: object) => ({
    ...base,
    color: 'var(--color-text-muted)',
    '&:hover': { color: 'var(--color-text-cream)' },
  }),
}
// ───────────────────────────────────────────────────────────────────────────

function Home() {

  const [stateOptions, setStateOptions] = useState<{ label: string; value: string }[]>([])
  const [cityOptions, setCityOptions] = useState<{ label: string; value: string }[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  // Track whether the external location API failed so we can show a fallback message
  const [locationError, setLocationError] = useState(false)
  // 'duplicate' is its own state so we can show a specific message when
  // Supabase rejects the insert because that email already exists (error code 23505).
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle')

  useEffect(() => {
    setLoadingStates(true)
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'United States' }),
    })
      .then((res) => res.json())
      .then((data) => {
        const options = data.data.states.map((s: { name: string; state_code: string }) => ({
          label: s.name,
          value: s.name,
        }))
        setStateOptions(options)
      })
      // If the API is down or returns a bad response, we surface a friendly error
      // instead of leaving the user staring at an endless spinner.
      .catch(() => setLocationError(true))
      .finally(() => setLoadingStates(false))
  }, [])

  function fetchCities(stateName: string) {
    setCityOptions([])
    setLoadingCities(true)
    fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'United States', state: stateName }),
    })
      .then((res) => res.json())
      .then((data) => {
        const options = data.data.map((city: string) => ({
          label: city,
          value: city,
        }))
        setCityOptions(options)
      })
      .catch(() => setLocationError(true))
      .finally(() => setLoadingCities(false))
  }

  const form = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      profession: '',
      city: '',
      state: '',
    },
    onSubmit: async ({ value }) => {
      setSubmitStatus('loading')
      const { error } = await supabase.from('waitlist').insert({
        first_name: value.first_name,
        last_name: value.last_name,
        email: value.email,
        profession: value.profession,
        city: value.city,
        state: value.state,
      })
      if (error) {
        console.error("Failed to add user to supabase waitlist", error)
        // Postgres unique-violation code — means this email is already on the list
        if (error.code === '23505') {
          setSubmitStatus('duplicate')
        } else {
          setSubmitStatus('error')
        }
      } else {
        setSubmitStatus('success')
      }
    },
  })

  return (
    <div>
      {/* Section 1: Header */}
      <section>
        <div className="p-8">
          <header className="pb-4 mb-6">
            <h1 className="flex items-center gap-4 text-2xl font-bold text-center">
              <motion.button 
                className="text-accent-amber"
                whileHover={{scale: 1.2}}
                whileTap={{scale: 0.85}}
              >
                Bond 
              </motion.button>

              <motion.div
                className="w-5 h-5 bg-amber-500 text-xs"
                animate={{
                    // scale: [1, 2, 2, 1, 1],
                    rotate: [0, 0, 180, 180, 0],
                    borderRadius: ["0%", "0%", "50%", "50%", "0%"],
                }}
                transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1],
                    repeat: Infinity,
                    repeatDelay: 1,
                }}
              >Insert Bond Logo</motion.div>
            </h1>
          </header>
        </div>
      

        {/* Action/Body Statement */}
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg">
            <div className="text-6xl font-bold mb-6">
              <p className="text-gradient-bond">Find Your Bonding Language</p>
            </div>
            <p className="font-bold">Bond makes being with your friends easy and seamless, no matter the situation</p>

            <motion.button 
              className="border-1 hover:border-3 rounded-4xl p-2 bg-accent-electric mt-6"
              whileHover={{scale: 1.1}}
              whileTap={{scale: 0.95}}
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Going Out
            </motion.button>
          </div>
        </div>

        {/* Video */}
        <div className="flex justify-center items-center m-6 rounded-3xl py-12 max-w-4xl mx-auto">
            <div className="video-float-frame rounded-2xl p-3"                                                                                                
              style={{                                                                                                                                      
                background: 'rgba(28, 36, 68, 0.6)',                                                                                                        
                backdropFilter: 'blur(12px)',       
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
              }}                                                                     
            >   
              <video width="700px" controls autoPlay muted loop style={{ borderRadius: '12px', display: 'block' }}>
                <source src="../videos/bond_example.mp4" type="video/mp4" />                              
                <source src="../videos/bond_example.webm" type="video/webm" />
              </video>                                                        
            </div>
        </div>

      </section>

      {/* Section 2: How does Bond Work? */}
      <section className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="font-bold text-4xl mb-12">How Bond helps your people</p>
          <div className="grid grid-cols-3 gap-6">
            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-amber) text-(--color-on-amber)">Step 1</span>
              <h3 className="text-xl font-bold">Create or Join your Crew</h3>
              <p className="text-xl leading-relaxed text-(--color-text-muted)">Set up your crew with your friends. Bond keeps everyone in the loop and make your plans a reality</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-tangerine) text-(--color-on-tangerine)">Step 2</span>
              <h3 className="text-xl font-bold">Bond creates your plan</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-muted)">Bond takes the guesswork out of planning. It suggests the right spot, time, and vibe based on what your crew is into, no back and forth needed.</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-electric) text-(--color-on-electric)">Step 3</span>
              <h3 className="text-xl font-bold">Just show up</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-muted)">Once the plan is set, all that's left is showing up. No organizing, no coordinating. Bond handles it so you can focus on the moment.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Mission Statement */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-6 text-(--color-accent-tangerine)">
              Our Mission
            </p>

            <p className="text-2xl leading-relaxed text-(--color-text-cream)">
              We created Bond with belief that people are at their best when surrounded by good company. 
              We want to make going out with your friends easy and fulfilling.
              <span className="text-(--color-accent-amber)"> No fuss, no long planning</span>, just living in the moment. That's what Bond is all about.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Waitlist */}
      <section id="waitlist" className="px-8 py-24">
        <div className="max-w-md mx-auto">
          <p className="text-2xl font-bold mb-8 text-center">Get Early Access!</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit() // calls our onSubmit
            }}
            className="flex flex-col gap-4"
          >
            <form.Field
              name="first_name"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'First name is required' : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">First Name</label>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)} 
                    onBlur={field.handleBlur}
                    placeholder="First Name"
                    maxLength={50}
                    className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-muted) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-electric)"
                    style={{
                      background: 'var(--color-surface-card)',
                      border: '1px solid var(--color-surface-slate)',
                    }}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="last_name"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Last name is required' : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">Last Name</label>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)} 
                    onBlur={field.handleBlur}
                    placeholder="Last Name"
                    maxLength={50}
                    className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-muted) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-electric)"
                    style={{
                      background: 'var(--color-surface-card)',
                      border: '1px solid var(--color-surface-slate)',
                    }}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                // We check two things in sequence:
                // 1. The field isn't empty
                // 2. It matches a basic email pattern (local@domain.tld)
                // This runs client-side on every keystroke, giving instant feedback.
                // The DB unique constraint (step 3) is the server-side safety net.
                onChange: ({ value }) => {
                  if (!value) return 'Email is required'
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address'
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">Email</label>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)} 
                    onBlur={field.handleBlur}
                    placeholder="Email"
                    type='email'
                    maxLength={254}
                    className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-muted) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-electric)"
                    style={{
                      background: 'var(--color-surface-card)',
                      border: '1px solid var(--color-surface-slate)',
                    }}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="profession"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Profession is required' : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">Profession</label>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)} 
                    onBlur={field.handleBlur}
                    placeholder="Profession (e.g. student, software engineer, doctor, etc)"
                    maxLength={100}
                    className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-muted) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-electric)"
                    style={{
                      background: 'var(--color-surface-card)',
                      border: '1px solid var(--color-surface-slate)',
                    }}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* If the location API is unreachable, tell the user rather than showing a broken dropdown */}
            {locationError && (
              <p className="text-sm text-(--color-accent-coral)">
                ⚠️ Could not load locations. Please type your city and state below instead, or try again later.
              </p>
            )}

            <form.Field
              name="state"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'State is required' : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">State</label>
                  <Select
                    options={stateOptions}
                    isLoading={loadingStates}
                    placeholder="Select a State..."
                    value={stateOptions.find((o) => o.value === field.state.value) ?? null}
                    onChange={(option) => {
                      field.handleChange(option?.value ?? '')
                      form.setFieldValue('city', '') // reset city when state changes
                      if (option?.value) fetchCities(option.value)
                    }}
                    onBlur={field.handleBlur}
                    styles={selectStyles}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="city"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'City is required' : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-(--color-text-muted) tracking-wide">City</label>
                  <Select
                    options={cityOptions}
                    isLoading={loadingCities}
                    isDisabled={!form.getFieldValue('state')}
                    placeholder="Select a City..."
                    value={cityOptions.find((o) => o.value === field.state.value) ?? null}
                    onChange={(option) => {
                      field.handleChange(option?.value ?? '')
                    }}
                    onBlur={field.handleBlur}
                    styles={selectStyles}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="text-xs text-(--color-accent-coral)">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Success message shown after a valid insert */}
            {submitStatus === 'success' && (
              <p className="text-center text-sm font-semibold text-(--color-accent-electric)">
                🎉 You're on the list! We'll be in touch.
              </p>
            )}

            {/* Duplicate email — friendly nudge instead of a generic error */}
            {submitStatus === 'duplicate' && (
              <p className="text-center text-sm font-semibold text-(--color-accent-amber)">
                Looks like you're already on the list! We'll be in touch. 👀
              </p>
            )}

            {/* Generic error if Supabase rejected the insert for any other reason */}
            {submitStatus === 'error' && (
              <p className="text-center text-sm font-semibold text-(--color-accent-coral)">
                Something went wrong. Please try again.
              </p>
            )}

            <button 
              type="submit"
              disabled={submitStatus === 'loading' || submitStatus === 'success' || submitStatus === 'duplicate'}
              className="border rounded-full p-2 font-bold hover:bg-accent-electric disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitStatus === 'loading' ? 'Submitting...' : 'Join Waitlist'}
            </button>

          </form>
        </div>
      </section>
      
    </div>
  )
}
