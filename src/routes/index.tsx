import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { useState, useEffect, useRef } from 'react'
import { EyeOff, Timer, MapPin, Star } from 'lucide-react'
import { Wordmark, FadeUp, ShinyButton } from '#/components/ui'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({ component: Home })

/* Floating "dynamic island" nav — expanded (full width, logo + CTA + log
   in) above 60px of scroll, collapsed to a small centered logo pill below
   it. Width animates via a plain CSS transition rather than Framer Motion
   (a layout-affecting property like this doesn't need spring physics), while
   the CTA/log-in fade in and out with AnimatePresence so they cross-fade
   independently of the width easing instead of stretching with it. */
function FloatingNav() {
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    function onScroll() {
      setExpanded(window.scrollY < 60)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <nav
        className="scale-75 relative rounded-full h-16 overflow-hidden border"
        style={{
          width: expanded ? 'min(calc(100% - 2rem), 71.25rem)' : '9rem',
          transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderColor: 'rgba(11,15,20,0.08)',
          boxShadow: '0 8px 32px rgba(11,15,20,0.14)',
        }}
      >
        <button
          onClick={() => setExpanded(true)}
          aria-label="Bond home"
          className={cn(
            'absolute top-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer',
            expanded ? 'left-6' : 'left-1/2 -translate-x-1/2',
          )}
        >
          <Wordmark className="text-2xl" />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="actions"
              className="absolute top-1/2 -translate-y-1/2 right-6 flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to="/login"
                search={{ returnTo: undefined }}
                className="text-base font-semibold whitespace-nowrap transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Log in
              </Link>
              <ShinyButton to="/welcome" className="h-12 px-5 text-base whitespace-nowrap">
                Start a party
              </ShinyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  )
}

// Animates a number from 0 to `to` with ease-out when in view
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
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3)
      setCount(Math.floor(to * progress))
      if (frame >= totalFrames) {
        setCount(to)
        clearInterval(timer)
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, to])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ── Phone frame — the one recurring object the whole story plays inside ── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-56 h-[27.5rem] sm:w-64 sm:h-[31.5rem] md:w-71 md:h-[37rem] rounded-[2rem] md:rounded-[2.75rem] overflow-hidden shrink-0"
      style={{ background: '#ffffff', border: '8px solid var(--color-ink)', boxShadow: '0 40px 80px -24px rgba(11,15,20,0.45)' }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 md:w-28 md:h-6 rounded-b-2xl z-10" style={{ background: 'var(--color-ink)' }} aria-hidden />
      {children}
    </div>
  )
}

/* Beat 1 — join screen, mirrors the real guest-invite hub */
function BeatInvite() {
  return (
    <div className="h-full flex flex-col px-5 pt-11 pb-6 gap-5">
      <p className="eyebrow" style={{ color: 'var(--color-ink-faint)' }}>Sam invited you</p>
      <p className="font-display font-extrabold text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>
        Saturday Night
      </p>
      <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>4 people joining</p>
      <div className="card px-4 py-4 flex flex-col gap-2 mt-2">
        <p className="eyebrow" style={{ color: 'var(--color-ink-faint)' }}>Your name</p>
        <div className="input !bg-(--color-surface-dim) flex items-center text-sm" style={{ color: 'var(--color-ink)' }}>Jordan</div>
      </div>
      <div className="flex -space-x-2 mt-1">
        {['S', 'M', 'A', 'K'].map((l, i) => (
          <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ background: '#dcebf4', color: 'var(--color-blueberry)', borderColor: '#fff' }}>
            {l}
          </div>
        ))}
      </div>
      <div className="mt-auto btn btn-primary w-full">Join the party</div>
    </div>
  )
}

/* Beat 2 — private taste picker, mirrors the real preference form */
function BeatTaste() {
  const cuisines = [{ label: 'Italian', on: true }, { label: 'Mexican', on: false }, { label: 'Sushi', on: true }, { label: 'Thai', on: false }, { label: 'BBQ', on: false }]
  return (
    <div className="h-full flex flex-col px-5 pt-11 pb-6 gap-5">
      <p className="eyebrow" style={{ color: 'var(--color-ink-faint)' }}>Your taste · private</p>
      <p className="font-display font-extrabold text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>
        In the mood for?
      </p>
      <div className="flex flex-wrap gap-2">
        {cuisines.map((c) => (
          <span key={c.label} className={`chip ${c.on ? 'chip-active' : ''}`}>{c.label}</span>
        ))}
      </div>
      <p className="eyebrow mt-2" style={{ color: 'var(--color-ink-faint)' }}>Budget</p>
      <div className="flex gap-2">
        {['$', '$$', '$$$', '$$$$'].map((s, i) => (
          <span key={s} className={`chip flex-1 justify-center !rounded-xl font-bold ${i === 1 ? 'chip-active' : ''}`}>{s}</span>
        ))}
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>Never shown to anyone else in the party.</p>
      <div className="mt-auto btn btn-primary w-full">Save my taste</div>
    </div>
  )
}

/* Beat 3 — the reveal, mirrors the real result screen. The one place
   Orange Peel gets to lead, since this is the emotional payoff. */
function BeatReveal() {
  return (
    <div className="h-full flex flex-col">
      <div className="h-44 relative flex items-start px-4 pt-8" style={{ background: 'linear-gradient(135deg,#f7b26e,var(--color-sunrise) 60%,var(--color-sunrise-deep))' }}>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ background: 'rgba(11,15,20,0.85)', color: '#fff' }}>
          Bond's pick
        </span>
      </div>
      <div className="flex-1 flex flex-col px-5 pt-5 pb-6 gap-4">
        <div>
          <p className="font-display font-extrabold text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>Casa Lumbre</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>Mexican · $$ · 0.4 mi away</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-ink-soft)' }}>
          <Star size={13} fill="var(--color-sunrise)" color="var(--color-sunrise)" aria-hidden />
          4.7 · loved by all 4 of you
        </div>
        <div className="mt-auto btn btn-primary w-full">Get directions</div>
      </div>
    </div>
  )
}

const BEATS = [
  { key: 'invite', eyebrow: '01 — Invite', title: 'Share one link.', body: 'No app to download. No account required. Anyone taps in and they’re in the party.', Node: BeatInvite },
  { key: 'taste', eyebrow: '02 — Taste', title: 'Everyone picks, privately.', body: 'Cravings, budget, dietary needs — set in ten seconds. Nobody else in the group sees it.', Node: BeatTaste },
  { key: 'reveal', eyebrow: '03 — Reveal', title: 'Bond finds the spot.', body: 'Every preference gets weighed. One restaurant rises to the top — a place the whole table agrees on.', Node: BeatReveal },
] as const

/* The signature moment: Bond's own three-step story, told as three
   ordinary sections the page scrolls through normally — no pinning,
   no captured scroll. Each row alternates which side the phone sits
   on, so the eye keeps moving instead of reading the same column
   three times. Numbering the eyebrows is warranted here (01/02/03):
   this genuinely is a sequence, not decoration. */
function FeatureRow({ beat, index }: { beat: (typeof BEATS)[number]; index: number }) {
  const phoneOnRight = index % 2 === 0
  const Node = beat.Node
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="max-w-285 mx-auto grid md:grid-cols-2 items-center gap-10 md:gap-20">
        <FadeUp className={phoneOnRight ? 'md:order-1' : 'md:order-2'}>
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
            <p className="eyebrow" style={{ color: 'var(--color-ember-text)' }}>{beat.eyebrow}</p>
            <h2 className="display text-3xl md:text-5xl">{beat.title}</h2>
            <p className="text-base md:text-lg leading-relaxed max-w-sm" style={{ color: 'var(--color-ink-soft)' }}>
              {beat.body}
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1} className={`flex justify-center ${phoneOnRight ? 'md:order-2' : 'md:order-1'}`}>
          <PhoneFrame><Node /></PhoneFrame>
        </FadeUp>
      </div>
    </section>
  )
}

function Home() {
  return (
    <div>

      {/* ── Floating nav ─────────────────────────────────────────────────── */}
      <FloatingNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20">
        <div className="max-w-225 mx-auto pt-24 md:pt-32 flex flex-col items-center text-center gap-7">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Every group has the same problem
          </motion.p>

          <motion.h1
            className="font-display font-extrabold leading-[0.98] whitespace-nowrap"
            style={{ fontSize: 'clamp(36px, 7.5vw, 92px)', letterSpacing: '-0.04em', color: 'var(--color-ink)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            Decided, together.
          </motion.h1>

          <motion.p
            className="text-lg leading-relaxed max-w-md"
            style={{ color: 'var(--color-ink-soft)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            Bond finds what actually matters to your group and turns it into
            one answer everyone's happy with.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShinyButton to="/welcome" className="whitespace-nowrap">
              Start a party
            </ShinyButton>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <div className="flex -space-x-2">
              {(['A', 'J', 'M', 'K'] as const).map((l, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: (['#4193bd', '#236797', '#113a5f', '#f1792d'] as const)[i], color: '#fff', borderColor: '#fff' }}
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Loved by 200+ friend groups on campus
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Signature — Bond's own three-step story, told in three
             alternating rows as the page scrolls normally ─────────── */}
      <div className="pt-4">
        <FadeUp className="px-6">
          <div className="max-w-285 mx-auto text-center">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="display text-3xl md:text-4xl">Three steps, one great dinner.</h2>
          </div>
        </FadeUp>
        {BEATS.map((beat, i) => (
          <FeatureRow key={beat.key} beat={beat} index={i} />
        ))}
      </div>

      {/* ── Stats — a translucent panel floating on the wash ──────────────── */}
      <section className="px-6 py-16">
        <FadeUp className="max-w-285 mx-auto">
          <div className="wash-panel px-8 py-12 md:px-14 md:py-16 flex flex-col gap-12">
            <div>
              <p className="eyebrow mb-4">The disconnect is real</p>
              <h2 className="display text-3xl md:text-4xl">
                Planning one night out<br />shouldn't take all night.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:pr-12 flex flex-col gap-3 pb-8 md:pb-0">
                <p className="font-display text-5xl md:text-7xl font-extrabold leading-none" style={{ color: 'var(--color-ink)' }}>
                  <CountUp to={5} suffix="+" />
                </p>
                <p className="leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                  Apps the average person juggles just to plan one night out
                </p>
              </div>
              <div className="md:px-12 flex flex-col gap-3 py-8 md:py-0 border-t border-b md:border-t-0 md:border-b-0 md:border-l" style={{ borderColor: 'rgba(11,15,20,0.12)' }}>
                <p className="font-display text-5xl md:text-7xl font-extrabold leading-none" style={{ color: 'var(--color-ink)' }}>
                  <CountUp to={37} suffix="%" />
                </p>
                <p className="leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                  Drop in time spent with friends between 2014–2023
                </p>
                <p className="text-xs opacity-60" style={{ color: 'var(--color-ink-faint)' }}>American Time Use Survey</p>
              </div>
              <div className="md:pl-12 flex flex-col gap-3 pt-8 md:pt-0 md:border-l" style={{ borderColor: 'rgba(11,15,20,0.12)' }}>
                <p className="font-display text-5xl md:text-7xl font-extrabold leading-none" style={{ color: 'var(--color-ink)' }}>
                  <CountUp to={20} suffix="hrs" />
                </p>
                <p className="leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                  Less social engagement with friends every single month
                </p>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── Why Bond ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-285 mx-auto flex flex-col gap-12">
          <FadeUp>
            <h2 className="display text-3xl md:text-4xl">Why Bond?</h2>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: MapPin, title: 'One answer, not a list', body: 'No endless scrolling, no voting rounds that drag on. Bond gives your group one recommendation it actually agrees on.' },
              { icon: EyeOff, title: 'Private by design', body: "Your dietary restrictions, your budget, your guilty-pleasure cravings — nobody in the group sees what you picked." },
              { icon: Timer, title: 'Under a minute', body: 'From party link to restaurant pick, the whole flow takes less than 60 seconds per person.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <FadeUp key={title} delay={i * 0.1} className="h-full">
                <div className="card p-7 flex flex-col gap-3 h-full !shadow-none">
                  <div className="flex items-center gap-3">
                    <Icon size={18} style={{ color: 'var(--color-ink)' }} aria-hidden />
                    <h3 className="display text-lg">{title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                    {body}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-225 mx-auto text-center">
          <FadeUp>
            <p className="eyebrow mb-6">Our mission</p>
            <p className="display text-2xl md:text-3xl leading-snug" style={{ fontWeight: 700 }}>
              People are at their best in{' '}
              <span style={{ color: 'var(--color-ember-text)' }}>good company</span>.
              We're here to make going out with your friends effortless —
              no fuss, no drawn-out planning. Just living in the moment.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Final CTA — ink-black band, one warm glow, closing the loop ──── */}
      <section className="px-6 pb-20">
        <div className="max-w-285 mx-auto">
          <FadeUp>
            <div
              className="relative rounded-[28px] px-8 py-16 text-center overflow-hidden flex flex-col items-center gap-6"
              style={{ background: 'var(--color-ink)' }}
            >
              <div
                className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(241,121,45,0.35), transparent 68%)' }}
                aria-hidden
              />
              <h2 className="relative font-display font-extrabold text-3xl md:text-4xl" style={{ color: '#ffffff', letterSpacing: '-0.02em' }}>
                Hungry? Settle it.
              </h2>
              <p className="relative text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Start a party in seconds. Your crew will thank you.
              </p>
              <ShinyButton to="/welcome" className="whitespace-nowrap">
                Start a party
              </ShinyButton>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 py-10 border-t" style={{ borderColor: 'var(--color-line)' }}>
        <div className="max-w-285 mx-auto flex flex-wrap items-center justify-between gap-4">
          <Wordmark className="text-lg" />
          <div className="flex gap-6 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            <Link to="/login" search={{ returnTo: undefined }} className="transition-opacity hover:opacity-70">Log in</Link>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>© 2026 Bond</p>
        </div>
      </footer>

    </div>
  )
}
