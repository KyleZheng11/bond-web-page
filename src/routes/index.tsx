import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useInView } from 'motion/react'
import { useState, useEffect, useRef } from 'react'

export const Route = createFileRoute('/')({ component: Home })

// Scroll-triggered slide-up reveal
function SlideUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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

function Home() {
  return (
    <div style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}>

      {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(251,243,231,0.85)',
          backdropFilter: 'blur(10px)',
          borderColor: 'var(--color-hairline)',
        }}
      >
        <div className="max-w-285 mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display text-xl font-black" style={{ color: 'var(--color-accent-ember)' }}>
            Bond
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-cream)' }}
            >
              Log in
            </Link>
            <Link
              to="/welcome"
              className="text-sm font-bold px-4 py-2 rounded-full transition-all hover:opacity-90"
              style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
            >
              Start a party
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-16 pb-16">
        {/* Soft tangerine radial blob */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(255,91,34,0.10), transparent 65%)' }}
        />
        <div className="max-w-285 mx-auto flex flex-wrap items-center gap-x-16 gap-y-12">
          {/* Left: copy */}
          <div className="flex-1 min-w-70 flex flex-col gap-6">
            <p className="text-xs font-black tracking-[.14em] uppercase" style={{ color: 'var(--color-text-mist)' }}>
              Eat together, easy
            </p>
            <h1
              className="font-display font-black leading-none"
              style={{ fontSize: 'clamp(48px, 7.5vw, 80px)', letterSpacing: '-0.02em', color: 'var(--color-text-cream)' }}
            >
              Good food.<br />
              <span style={{ color: 'var(--color-accent-ember)' }}>Zero drama.</span>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: '#6A6056', maxWidth: '380px' }}>
              Bond collects everyone's preferences and picks one restaurant your whole crew will love. No group chat needed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/welcome"
                className="px-6 py-3 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
              >
                Start a party
              </Link>
              <a
                href="#how"
                className="px-6 py-3 rounded-full font-bold text-sm border-2 transition-all hover:opacity-70"
                style={{ color: 'var(--color-text-cream)', borderColor: 'var(--color-text-cream)' }}
              >
                How it works
              </a>
            </div>
            {/* Avatar stack + social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {(['A', 'J', 'M', 'K'] as const).map((l, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: (['#FF5B22', '#1FA85C', '#7A3CC4', '#D7372A'] as const)[i],
                      color: '#fff',
                      borderColor: 'var(--color-surface-deep)',
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                Loved by 200+ friend groups on campus
              </p>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="flex-1 min-w-55 flex justify-center">
            <div
              className="video-float-frame relative w-50 h-100 rounded-4xl flex flex-col overflow-hidden"
              style={{ background: '#fff', border: '6px solid #211B16', boxShadow: '0 24px 60px rgba(33,27,22,0.18)' }}
            >
              {/* notch */}
              <div className="h-5 flex items-center justify-center shrink-0" style={{ background: '#FBF3E7' }}>
                <div className="w-14 h-1 rounded-full" style={{ background: '#EFE3D2' }} />
              </div>
              {/* mock results screen */}
              <div className="flex-1 flex flex-col gap-2 p-3" style={{ background: '#FBF3E7' }}>
                <div className="h-24 rounded-[14px] flex items-start p-2" style={{ background: '#F0D9B5' }}>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white" style={{ background: '#FF5B22' }}>
                    Bond's pick
                  </span>
                </div>
                <div className="h-3 rounded-full mt-1" style={{ background: '#211B16', width: '75%' }} />
                <div className="h-2.5 rounded-full" style={{ background: '#EFE3D2', width: '45%' }} />
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F1ECE2', color: '#8A7F72' }}>Italian</span>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFE9DF', color: '#FF5B22' }}>★ 4.6</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: '#EFE3D2', width: '90%' }} />
                <div className="h-2 rounded-full" style={{ background: '#EFE3D2', width: '80%' }} />
                <div className="mt-auto flex flex-col gap-1.5">
                  <div className="h-7 rounded-full" style={{ background: '#FF5B22' }} />
                  <div className="h-7 rounded-full border" style={{ background: '#fff', borderColor: '#EFE3D2' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────────────────── */}
      <section className="px-6 py-16" style={{ background: '#211B16' }}>
        <div className="max-w-285 mx-auto flex flex-col gap-10">
          <SlideUp>
            <p className="text-xs font-black tracking-[.14em] uppercase mb-4" style={{ color: 'var(--color-accent-ember)' }}>
              The disconnect is real
            </p>
            <h2
              className="font-display font-black text-3xl md:text-4xl"
              style={{ color: '#FBF3E7', letterSpacing: '-0.02em' }}
            >
              Planning one night out<br />shouldn't take all night.
            </h2>
          </SlideUp>
          <SlideUp delay={0.15}>
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:pr-12 flex flex-col gap-3 pb-8 md:pb-0">
                <p className="text-5xl md:text-7xl font-black leading-none" style={{ color: 'var(--color-accent-ember)' }}>
                  <CountUp to={5} suffix="+" />
                </p>
                <p className="leading-relaxed" style={{ color: '#8A7F72' }}>
                  Apps the average person juggles just to plan one night out
                </p>
              </div>
              <div
                className="md:px-12 flex flex-col gap-3 py-8 md:py-0 border-t border-b md:border-t-0 md:border-b-0 md:border-l"
                style={{ borderColor: '#3A332C' }}
              >
                <p className="text-5xl md:text-7xl font-black leading-none" style={{ color: 'var(--color-accent-ember)' }}>
                  <CountUp to={37} suffix="%" />
                </p>
                <p className="leading-relaxed" style={{ color: '#8A7F72' }}>
                  Drop in time spent with friends between 2014–2023
                </p>
                <p className="text-xs opacity-50 mt-1" style={{ color: '#8A7F72' }}>American Time Use Survey</p>
              </div>
              <div
                className="md:pl-12 flex flex-col gap-3 pt-8 md:pt-0 md:border-l"
                style={{ borderColor: '#3A332C' }}
              >
                <p className="text-5xl md:text-7xl font-black leading-none" style={{ color: 'var(--color-accent-ember)' }}>
                  <CountUp to={20} suffix="hrs" />
                </p>
                <p className="leading-relaxed" style={{ color: '#8A7F72' }}>
                  Less social engagement with friends every single month
                </p>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="px-6 py-16">
        <div className="max-w-285 mx-auto flex flex-col gap-10">
          <SlideUp>
            <p className="text-xs font-black tracking-[.14em] uppercase mb-3" style={{ color: 'var(--color-text-mist)' }}>
              How it works
            </p>
            <h2
              className="font-display font-black text-3xl md:text-4xl"
              style={{ letterSpacing: '-0.02em', color: 'var(--color-text-cream)' }}
            >
              Three steps, one great dinner.
            </h2>
          </SlideUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: '1', title: 'Add your crew', body: 'Share a link. Anyone can join in seconds — no app, no account required.' },
              { n: '2', title: 'Everyone picks', body: 'Each person takes 60 seconds to set their cuisines and budget. All private.' },
              { n: '3', title: 'Bond decides', body: 'Bond weighs every preference and surfaces one restaurant everyone can get behind.' },
            ].map(({ n, title, body }, i) => (
              <SlideUp key={n} delay={i * 0.1}>
                <motion.div
                  className="rounded-[18px] p-7 flex flex-col gap-4 h-full"
                  style={{
                    background: 'var(--color-surface-petrol)',
                    border: '1px solid var(--color-hairline)',
                    boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  }}
                  whileHover={{ y: -5, boxShadow: '0 18px 40px rgba(33,27,22,.10)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
                    style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                  >
                    {n}
                  </div>
                  <h3 className="font-display text-xl font-black" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6A6056' }}>{body}</p>
                </motion.div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Bond ─────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 border-t border-b"
        style={{ background: 'var(--color-surface-petrol)', borderColor: 'var(--color-hairline)' }}
      >
        <div className="max-w-285 mx-auto flex flex-col gap-10">
          <SlideUp>
            <h2
              className="font-display font-black text-3xl md:text-4xl"
              style={{ letterSpacing: '-0.02em', color: 'var(--color-text-cream)' }}
            >
              Why Bond?
            </h2>
          </SlideUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: 'One answer, not a list', body: 'No endless scrolling, no voting rounds. Bond gives you one recommendation your group actually agrees on.', border: 'var(--color-accent-ember)' },
              { title: 'Private by design', body: "Nobody sees what you picked. Your dietary restrictions, your budget, your preferences — all yours.", border: 'var(--color-accent-gold)' },
              { title: 'Under a minute', body: 'From party link to restaurant pick, the whole flow takes less than 60 seconds per person.', border: 'var(--color-text-cream)' },
            ].map(({ title, body, border }, i) => (
              <SlideUp key={title} delay={i * 0.1}>
                <div
                  className="rounded-[18px] p-7 flex flex-col gap-3 h-full"
                  style={{
                    background: 'var(--color-surface-deep)',
                    borderTop: `3px solid ${border}`,
                    border: `1px solid var(--color-hairline)`,
                    borderTopWidth: '3px',
                    borderTopColor: border,
                  }}
                >
                  <h3 className="font-display text-lg font-black" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6A6056' }}>{body}</p>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-225 mx-auto text-center">
          <SlideUp>
            <p className="text-xs font-black tracking-[.14em] uppercase mb-6" style={{ color: 'var(--color-text-mist)' }}>
              Our mission
            </p>
            <p
              className="font-display font-black text-2xl md:text-3xl leading-snug"
              style={{ letterSpacing: '-0.02em', color: 'var(--color-text-cream)' }}
            >
              We believe people are at their best when surrounded by{' '}
              <span style={{ color: 'var(--color-accent-ember)' }}>good company</span>.
              We want to make going out with your friends easy and fulfilling —
              no fuss, no long planning. Just living in the moment.
            </p>
          </SlideUp>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-285 mx-auto">
          <SlideUp>
            <div
              className="relative rounded-3xl px-8 py-14 text-center overflow-hidden flex flex-col items-center gap-6"
              style={{ background: 'var(--color-accent-ember)' }}
            >
              {/* Decorative circles */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20" style={{ background: '#fff' }} />
              <div className="absolute -bottom-16 -left-8 w-64 h-64 rounded-full opacity-10" style={{ background: '#fff' }} />
              <h2
                className="relative font-display font-black text-3xl md:text-4xl"
                style={{ color: '#fff', letterSpacing: '-0.02em' }}
              >
                Hungry? Settle it.
              </h2>
              <p className="relative text-base" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Start a party in seconds. Your crew will thank you.
              </p>
              <Link
                to="/welcome"
                className="relative px-7 py-3 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: '#fff', color: 'var(--color-accent-ember)' }}
              >
                Start a party →
              </Link>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-8 border-t"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <div className="max-w-285 mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="font-display font-black text-lg" style={{ color: 'var(--color-accent-ember)' }}>Bond</span>
          <div className="flex gap-6 text-sm" style={{ color: 'var(--color-text-mist)' }}>
            <a href="#how" className="transition-opacity hover:opacity-70">How it works</a>
            <Link to="/login" className="transition-opacity hover:opacity-70">Log in</Link>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>© 2026 Bond</p>
        </div>
      </footer>

    </div>
  )
}
