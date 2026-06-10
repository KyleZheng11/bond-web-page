import { supabase } from '#/lib/supabase'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, useInView } from 'motion/react'
import { useState, useEffect, useRef } from 'react'
import Select from 'react-select'

export const Route = createFileRoute('/')({ component: Home })

// ─── SlideUp ───────────────────────────────────────────────────────────────
// Wraps any content in a scroll-triggered slide-up reveal.
// `once: true` means it fires only the first time the element enters the viewport.
// `margin: '-80px'` starts the animation just before the element is fully visible.
function SlideUp({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}
// ───────────────────────────────────────────────────────────────────────────

// ─── CountUp ───────────────────────────────────────────────────────────────
// Animates a number from 0 to `to` using an ease-out curve when scrolled into
// view. `once: true` means the animation only runs the first time.
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1800
    const totalFrames = (duration / 1000) * 60
    let frame = 0
    const timer = setInterval(() => {
      frame++
      // cubic ease-out: fast start, slow finish
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3)
      setCount(Math.floor(to * progress))
      if (frame >= totalFrames) {
        setCount(to)
        clearInterval(timer)
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, to])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}
// ───────────────────────────────────────────────────────────────────────────

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    background: 'var(--color-surface-petrol)',
    border: `1px solid ${state.isFocused ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)'}`,
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 2px var(--color-accent-ember)' : 'none',
    padding: '2px 4px',
  }),
  menu: (base: object) => ({
    ...base,
    background: 'var(--color-surface-petrol)',
    border: '1px solid var(--color-surface-twilight)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
  }),
  option: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    background: state.isFocused
      ? 'var(--color-surface-twilight)'
      : 'transparent',
    color: 'var(--color-text-cream)',
    cursor: 'pointer',
  }),
  singleValue: (base: object) => ({
    ...base,
    color: 'var(--color-text-cream)',
  }),
  placeholder: (base: object) => ({ ...base, color: 'var(--color-text-mist)' }),
  input: (base: object) => ({ ...base, color: 'var(--color-text-cream)' }),
  loadingIndicator: (base: object) => ({
    ...base,
    color: 'var(--color-accent-ember)',
  }),
}

function Home() {
  const navigate = useNavigate()
  const [stateOptions, setStateOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [cityOptions, setCityOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  // Track whether the external location API failed so we can show a fallback message
  const [locationError, setLocationError] = useState(false)
  // 'duplicate' is its own state so we can show a specific message when
  // Supabase rejects the insert because that email already exists (error code 23505).
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'loading' | 'success' | 'error' | 'duplicate'
  >('idle')

  useEffect(() => {
    setLoadingStates(true)
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'United States' }),
    })
      .then((res) => res.json())
      .then((data) => {
        const options = data.data.states.map(
          (s: { name: string; state_code: string }) => ({
            label: s.name,
            value: s.name,
          }),
        )
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
        console.error('Failed to add user to supabase waitlist', error)
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
        <div className="p-5 sm:p-8">
          <header className="pb-4 mb-6">
            <h1 className="flex items-center gap-4 text-2xl font-bold text-center">
              <motion.button
                className="text-accent-gold"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate({ to: '/' })}
              >
                Bond
              </motion.button>

              {/* <motion.div
                className="w-5 h-5"
                animate={{
                  rotate: [0, 0, 180, 180, 0],
                  borderRadius: ['0%', '0%', '50%', '50%', '0%'],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                  times: [0, 0.2, 0.5, 0.8, 1],
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                <img
                  src="bond-icon.png"
                  className="w-full h-full object-contain"
                />
              </motion.div> */}
            </h1>
          </header>
        </div>

        {/* Action/Body Statement */}
        <div className="flex justify-center items-center">
          <SlideUp>
            <div className="text-center mt-4 text-lg">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6">
                <p className="text-gradient-bond">Find Your Bonding Language</p>
              </div>
              <p className="font-bold">
                Bond makes being with your friends easy and seamless, no matter
                the situation
              </p>

              <motion.button
                className="border-1 hover:border-3 rounded-4xl px-6 py-3 bg-accent-ember mt-8 md:mt-16 font-semibold"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate({ to: '/welcome' })}
              >
                Find your Bond
              </motion.button>
            </div>
          </SlideUp>
        </div>

        {/* Video */}
        {/* <div className="flex justify-center items-center m-6 rounded-3xl py-12 max-w-4xl mx-auto">
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
        </div> */}
      </section>

      {/* Section 2: Core Features? */}
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="max-w-6xl mx-auto">
          <SlideUp>
            <p className="font-bold text-2xl md:text-4xl mb-8 md:mb-12 text-center">
              Core Features
            </p>
          </SlideUp>
          <SlideUp delay={0.15}>
            <div className="flex flex-col gap-6 max-w-2xl mx-auto">
              <motion.div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: 'var(--color-surface-petrol)',
                  border: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h3 className="text-xl font-bold">Add Your People</h3>
                <p className="text-xl leading-relaxed text-(--color-text-mist)">
                  Add your people, Bond keeps them at the center of every plan
                </p>
              </motion.div>

              <motion.div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: 'var(--color-surface-petrol)',
                  border: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h3 className="text-xl font-bold">
                  Get personalized Recommendations for Your Group
                </h3>
                <p className="text-x1 leading-relaxed text-(--color-text-mist)">
                  No more endless group chats going nowhere. Bond suggests
                  places and experiences tailored to your group's vibe, so you
                  spend less time deciding and more time going
                </p>
              </motion.div>

              <motion.div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: 'var(--color-surface-petrol)',
                  border: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h3 className="text-xl font-bold">Reserve Your Table</h3>
                <p className="text-x1 leading-relaxed text-(--color-text-mist)">
                  Book your spot without ever leaving the app. Once you've found
                  the right place, locking it in takes seconds.
                </p>
              </motion.div>

              <motion.div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: 'var(--color-surface-petrol)',
                  border: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h3 className="text-xl font-bold">
                  Set Checkpoints to Meet Your People
                </h3>
                <p className="text-x1 leading-relaxed text-(--color-text-mist)">
                  Pick where everyone meets up before heading out and see how
                  long they need to get there.
                </p>
              </motion.div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* Section 3: Bond in Numbers */}
      <section className="px-5 py-12 md:px-8 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SlideUp>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-(--color-accent-brick)">
              The Disconnect is Real
            </p>
            <p className="font-bold text-2xl md:text-4xl mb-8 md:mb-16">
              Bond in Numbers
            </p>
          </SlideUp>

          <SlideUp delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Stat 1 */}
              <div className="md:pr-12 flex flex-col gap-3 pb-8 md:pb-0">
                <p className="text-5xl md:text-7xl font-black text-gradient-bond leading-none">
                  <CountUp to={5} suffix="+" />
                </p>
                <p className="text-(--color-text-mist) leading-relaxed">
                  Apps the average person juggles just to plan one night out
                </p>
              </div>

              {/* Stat 2 */}
              <div
                className="md:px-12 flex flex-col gap-3 py-8 md:py-0 border-t border-b md:border-t-0 md:border-b-0 md:border-l"
                style={{ borderColor: 'var(--color-surface-twilight)' }}
              >
                <p className="text-5xl md:text-7xl font-black text-gradient-bond leading-none">
                  <CountUp to={37} suffix="%" />
                </p>
                <p className="text-(--color-text-mist) leading-relaxed">
                  Drop in time spent with friends between 2014–2023
                </p>
                <p className="text-xs text-(--color-text-mist) opacity-50 mt-1">
                  American Time Use Survey
                </p>
              </div>

              {/* Stat 3 */}
              <div
                className="md:pl-12 flex flex-col gap-3 pt-8 md:pt-0 md:border-l"
                style={{ borderColor: 'var(--color-surface-twilight)' }}
              >
                <p className="text-5xl md:text-7xl font-black text-gradient-bond leading-none">
                  <CountUp to={20} suffix="hrs" />
                </p>
                <p className="text-(--color-text-mist) leading-relaxed">
                  Less social engagement with friends every single month
                </p>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* Section 4: How To */}
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="max-w-3xl mx-auto">
          <SlideUp>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-(--color-accent-aurora)">
              How It Works
            </p>
            <p className="font-bold text-2xl md:text-4xl mb-10 md:mb-16">
              From idea to memory,
              <br />
              in minutes.
            </p>
          </SlideUp>

          <div className="relative">
            {/* Vertical line connecting all steps */}
            <div
              className="absolute top-5 bottom-5 w-px left-5"
              style={{ background: 'var(--color-surface-twilight)' }}
            />

            {/* Step 1 */}
            <SlideUp delay={0.1}>
              <div className="relative flex gap-5 md:gap-8 pb-10 md:pb-14">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10"
                  style={{
                    background: 'var(--color-accent-ember)',
                    color: 'var(--color-on-ember)',
                    boxShadow: '0 0 16px #D45A1F55',
                  }}
                >
                  1
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-(--color-accent-ember) mb-1">
                    Step 1
                  </p>
                  <h3 className="text-xl font-bold mb-2">
                    Set Your Preferences
                  </h3>
                  <p className="leading-relaxed text-(--color-text-mist)">
                    Tell Bond what you're into — your favorite cuisines, the
                    vibe you're after, your budget, and how far you want to go.
                    The more Bond knows, the better it plans.
                  </p>
                </div>
              </div>
            </SlideUp>

            {/* Step 2 */}
            <SlideUp delay={0.2}>
              <div className="relative flex gap-5 md:gap-8 pb-10 md:pb-14">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10"
                  style={{
                    background: 'var(--color-accent-ember)',
                    color: 'var(--color-on-ember)',
                    boxShadow: '0 0 16px #D45A1F55',
                  }}
                >
                  2
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-(--color-accent-ember) mb-1">
                    Step 2
                  </p>
                  <h3 className="text-xl font-bold mb-2">
                    Party Up with Your People
                  </h3>
                  <p className="leading-relaxed text-(--color-text-mist)">
                    Build your group before the planning starts. Add the Bonds
                    you want to bring along so their preferences are factored in
                    from the beginning.
                  </p>
                </div>
              </div>
            </SlideUp>

            {/* Step 3 */}
            <SlideUp delay={0.3}>
              <div className="relative flex gap-5 md:gap-8 pb-10 md:pb-14">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10"
                  style={{
                    background: 'var(--color-accent-ember)',
                    color: 'var(--color-on-ember)',
                    boxShadow: '0 0 16px #D45A1F55',
                  }}
                >
                  3
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-(--color-accent-ember) mb-1">
                    Step 3
                  </p>

                  <h3 className="text-xl font-bold mb-2">
                    Find the Best Recommendation
                  </h3>
                  <p className="leading-relaxed text-(--color-text-mist)">
                    Bond takes everyone's preferences and surfaces the best
                    match for the whole group — one recommendation everyone can
                    get behind, without the back-and-forth.
                  </p>
                </div>
              </div>
            </SlideUp>

            {/* Wildcard */}
            <SlideUp delay={0.4}>
              <div className="relative flex gap-5 md:gap-8 pb-10 md:pb-14">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10"
                  style={{
                    background: 'var(--color-accent-brick)',
                    color: 'var(--color-on-brick)',
                    boxShadow: '0 0 16px #B82E1C55',
                  }}
                >
                  ?
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-(--color-accent-brick) mb-1">
                    Wildcard
                  </p>
                  <h3 className="text-xl font-bold mb-2">
                    Your People Do What They Do
                  </h3>
                  <p className="leading-relaxed text-(--color-text-mist)">
                    Set up the whole moment, watch it crash and burn because
                    your people love making life hard.
                  </p>
                </div>
              </div>
            </SlideUp>

            {/* Step 4 */}
            <SlideUp delay={0.5}>
              <div className="relative flex gap-5 md:gap-8">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10"
                  style={{
                    background: 'var(--color-accent-ember)',
                    color: 'var(--color-on-ember)',
                    boxShadow: '0 0 16px #D45A1F55',
                  }}
                >
                  4
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-(--color-accent-ember) mb-1">
                    Step 4
                  </p>
                  <h3 className="text-xl font-bold mb-2">Enjoy Your Time</h3>
                  <p className="leading-relaxed text-(--color-text-mist)">
                    All the planning is done. The memories are just getting
                    started.
                  </p>
                </div>
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* Section 5: Differentiators */}
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="max-w-6xl mx-auto">
          <SlideUp>
            <p className="font-bold text-2xl md:text-4xl mb-8 md:mb-12">
              Key Differentiators
            </p>
          </SlideUp>

          {/*
            Each card is staggered independently so they cascade in one by one.
            The thick top border stripe is the primary accent — each card gets
            its own Bond color (amber, electric, coral) so they feel distinct.
            The large faded ordinal in the corner adds texture without cluttering.
            Hover glow matches each card's own accent color.
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — amber */}
            <SlideUp delay={0.1}>
              <motion.div
                className="rounded-2xl p-7 flex flex-col gap-4 relative overflow-hidden h-full"
                style={{
                  background: 'var(--color-surface-petrol)',
                  borderTop: '4px solid var(--color-accent-gold)',
                  borderRight: '1px solid var(--color-surface-twilight)',
                  borderBottom: '1px solid var(--color-surface-twilight)',
                  borderLeft: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -8, boxShadow: '0 0 48px #E8A93C2A' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span
                  className="absolute top-3 right-5 text-8xl font-black select-none pointer-events-none leading-none"
                  style={{ color: 'var(--color-accent-gold)', opacity: 0.1 }}
                >
                  01
                </span>
                <p className="text-xl leading-relaxed text-(--color-text-mist) mt-6">
                  We provide the option to build your whole night. From the
                  thought of the occasion till it becomes memory.
                </p>
              </motion.div>
            </SlideUp>

            {/* Card 2 — electric */}
            <SlideUp delay={0.2}>
              <motion.div
                className="rounded-2xl p-7 flex flex-col gap-4 relative overflow-hidden h-full"
                style={{
                  background: 'var(--color-surface-petrol)',
                  borderTop: '4px solid var(--color-accent-ember)',
                  borderRight: '1px solid var(--color-surface-twilight)',
                  borderBottom: '1px solid var(--color-surface-twilight)',
                  borderLeft: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -8, boxShadow: '0 0 48px #D45A1F2A' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span
                  className="absolute top-3 right-5 text-8xl font-black select-none pointer-events-none leading-none"
                  style={{
                    color: 'var(--color-accent-ember)',
                    opacity: 0.1,
                  }}
                >
                  02
                </span>
                <p className="text-xl leading-relaxed text-(--color-text-mist) mt-6">
                  We are not giving you more options. We are giving you a short
                  list of the right options.
                </p>
              </motion.div>
            </SlideUp>

            {/* Card 3 — coral */}
            <SlideUp delay={0.3}>
              <motion.div
                className="rounded-2xl p-7 flex flex-col gap-4 relative overflow-hidden h-full"
                style={{
                  background: 'var(--color-surface-petrol)',
                  borderTop: '4px solid var(--color-accent-brick)',
                  borderRight: '1px solid var(--color-surface-twilight)',
                  borderBottom: '1px solid var(--color-surface-twilight)',
                  borderLeft: '1px solid var(--color-surface-twilight)',
                }}
                whileHover={{ y: -8, boxShadow: '0 0 48px #B82E1C2A' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span
                  className="absolute top-3 right-5 text-8xl font-black select-none pointer-events-none leading-none"
                  style={{ color: 'var(--color-accent-brick)', opacity: 0.1 }}
                >
                  03
                </span>
                <p className="text-xl leading-relaxed text-(--color-text-mist) mt-6">
                  We are not just bringing options. We are bringing a toolkit to
                  summon group leaders.
                </p>
              </motion.div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* Section 4: How does Bond Work?
      <section className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="font-bold text-4xl mb-12">How Bond helps your people</p>
          <div className="grid grid-cols-3 gap-6">
            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-surface-twilight)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-gold) text-(--color-on-gold)">Step 1</span>
              <h3 className="text-xl font-bold">Create or Join your Crew</h3>
              <p className="text-xl leading-relaxed text-(--color-text-mist)">Set up your crew with your friends. Bond keeps everyone in the loop and make your plans a reality</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-surface-twilight)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-ember) text-(--color-on-ember)">Step 2</span>
              <h3 className="text-xl font-bold">Bond creates your plan</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-mist)">Bond takes the guesswork out of planning. It suggests the right spot, time, and vibe based on what your crew is into, no back and forth needed.</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-surface-twilight)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #E8A93C22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-ember) text-(--color-on-aurora)">Step 3</span>
              <h3 className="text-xl font-bold">Just show up</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-mist)">Once the plan is set, all that's left is showing up. No organizing, no coordinating. Bond handles it so you can focus on the moment.</p>
            </motion.div>
          </div>
        </div>
      </section> */}

      {/* Section 5: Mission Statement */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <SlideUp>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-6 text-(--color-accent-ember)">
              Our Mission
            </p>

            <p className="text-2xl leading-relaxed text-(--color-text-cream)">
              We created Bond with belief that people are at their best when
              surrounded by good company. We want to make going out with your
              friends easy and fulfilling.
              <span className="text-(--color-accent-gold)">
                {' '}
                No fuss, no long planning
              </span>
              , just living in the moment. That's what Bond is all about.
            </p>
          </SlideUp>
        </div>
      </section>

      {/* Section 6: Waitlist */}
      <section id="waitlist" className="px-8 py-24">
        <div className="max-w-md mx-auto">
          <SlideUp>
            <p className="text-2xl font-bold mb-8 text-center">
              Get Early Access!
            </p>
          </SlideUp>
          <SlideUp delay={0.15}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
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
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      First Name
                    </label>
                    <input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="First Name"
                      maxLength={50}
                      className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-mist) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-ember)"
                      style={{
                        background: 'var(--color-surface-petrol)',
                        border: '1px solid var(--color-surface-twilight)',
                      }}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
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
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      Last Name
                    </label>
                    <input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Last Name"
                      maxLength={50}
                      className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-mist) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-ember)"
                      style={{
                        background: 'var(--color-surface-petrol)',
                        border: '1px solid var(--color-surface-twilight)',
                      }}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Email is required'
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                      return 'Enter a valid email address'
                    return undefined
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      Email
                    </label>
                    <input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Email"
                      type="email"
                      maxLength={254}
                      className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-mist) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-ember)"
                      style={{
                        background: 'var(--color-surface-petrol)',
                        border: '1px solid var(--color-surface-twilight)',
                      }}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
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
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      Profession
                    </label>
                    <input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Profession (e.g. student, software engineer, doctor, etc)"
                      maxLength={100}
                      className="rounded-xl px-4 py-3 text-(--color-text-cream) placeholder:text-(--color-text-mist) outline-none transition-all duration-200
  focus:ring-2 focus:ring-(--color-accent-ember)"
                      style={{
                        background: 'var(--color-surface-petrol)',
                        border: '1px solid var(--color-surface-twilight)',
                      }}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              {locationError && (
                <p className="text-sm text-(--color-accent-brick)">
                  ⚠️ Could not load locations. Please type your city and state
                  below instead, or try again later.
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
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      State
                    </label>
                    <Select
                      options={stateOptions}
                      isLoading={loadingStates}
                      placeholder="Select a State..."
                      value={
                        stateOptions.find(
                          (o) => o.value === field.state.value,
                        ) ?? null
                      }
                      onChange={(option) => {
                        field.handleChange(option?.value ?? '')
                        form.setFieldValue('city', '')
                        if (option?.value) fetchCities(option.value)
                      }}
                      onBlur={field.handleBlur}
                      styles={selectStyles}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
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
                    <label className="text-sm font-semibold text-(--color-text-mist) tracking-wide">
                      City
                    </label>
                    <Select
                      options={cityOptions}
                      isLoading={loadingCities}
                      isDisabled={!form.getFieldValue('state')}
                      placeholder="Select a City..."
                      value={
                        cityOptions.find(
                          (o) => o.value === field.state.value,
                        ) ?? null
                      }
                      onChange={(option) => {
                        field.handleChange(option?.value ?? '')
                      }}
                      onBlur={field.handleBlur}
                      styles={selectStyles}
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors[0] && (
                        <p className="text-xs text-(--color-accent-brick)">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              {submitStatus === 'success' && (
                <p className="text-center text-sm font-semibold text-(--color-accent-aurora)">
                  🎉 You're on the list! We'll be in touch.
                </p>
              )}

              {submitStatus === 'duplicate' && (
                <p className="text-center text-sm font-semibold text-(--color-accent-gold)">
                  Looks like you're already on the list! We'll be in touch. 👀
                </p>
              )}

              {submitStatus === 'error' && (
                <p className="text-center text-sm font-semibold text-(--color-accent-brick)">
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitStatus === 'loading' ||
                  submitStatus === 'success' ||
                  submitStatus === 'duplicate'
                }
                className="border rounded-full p-2 font-bold hover:bg-accent-ember disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitStatus === 'loading' ? 'Submitting...' : 'Join Waitlist'}
              </button>
            </form>
          </SlideUp>
        </div>
      </section>
    </div>
  )
}
