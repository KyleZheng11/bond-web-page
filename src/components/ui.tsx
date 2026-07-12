import { Link } from '@tanstack/react-router'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '#/lib/utils'

/* The ambient sunrise wash, scroll-linked: the orange glow rises from
   bottom-left toward top-right as the page scrolls, blue recedes the
   opposite way. Lives here (not per-route) so every screen gets the
   exact same behavior from one source. It only ever touches this
   wrapper's decorative background — never layout — so scrolling
   itself is completely unaffected on every page it wraps. Reduced-
   motion users get the static default wash instead of the scroll tie. */
export function WashBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()

  // Pages shorter than the viewport (a login form, an error state)
  // have no scrollable range at all — scrollHeight - clientHeight is
  // 0, and dividing by that lands scrollYProgress on 1, not 0, so
  // the wash was rendering as if fully scrolled on the very first
  // frame of a page nobody had scrolled. Tie the scroll-linked wash
  // to the page actually being scrollable; otherwise hold it static.
  const [isScrollable, setIsScrollable] = useState(false)
  useEffect(() => {
    const check = () => setIsScrollable(document.documentElement.scrollHeight > window.innerHeight + 1)
    check()
    window.addEventListener('resize', check)
    const observer = new ResizeObserver(check)
    observer.observe(document.documentElement)
    return () => {
      window.removeEventListener('resize', check)
      observer.disconnect()
    }
  }, [])

  const washAX = useTransform(scrollYProgress, [0, 1], ['4%', '96%'])
  const washAY = useTransform(scrollYProgress, [0, 1], ['100%', '4%'])
  const washBX = useTransform(scrollYProgress, [0, 1], ['100%', '6%'])
  const washBY = useTransform(scrollYProgress, [0, 1], ['0%', '96%'])

  const animateWash = isScrollable && !prefersReducedMotion

  return (
    <motion.div
      className={cn('hero-wash', className)}
      style={{
        color: 'var(--color-ink)',
        ...(animateWash ? {
          '--wash-a-x': washAX,
          '--wash-a-y': washAY,
          '--wash-b-x': washBX,
          '--wash-b-y': washBY,
        } : {}),
      }}
    >
      {children}
    </motion.div>
  )
}

/* Coded wordmark until final logo files land: "bond" in deep ink,
   with the "o" as a rising sun (sunrise gradient). */
export function Wordmark({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span
      className={cn('font-display font-extrabold tracking-tight select-none', className)}
      style={{ color: dark ? '#ffffff' : 'var(--color-ink)' }}
    >
      b
      <span
        style={{
          background: 'linear-gradient(180deg, #f7b26e 0%, var(--color-sunrise) 60%, var(--color-sunrise-deep) 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        o
      </span>
      nd
    </span>
  )
}

/* Standard app-screen header: back link on the left, wordmark on the right.
   `wide` drops the max-w-lg cap — use it on screens with a full-bleed
   hero (like the result reveal) so the nav lines up with the hero's
   own edges instead of floating narrower than everything below it. */
export function AppHeader({
  backTo,
  backLabel = 'Back',
  onBack,
  dark = false,
  wide = false,
}: {
  backTo?: string
  backLabel?: string
  onBack?: () => void
  dark?: boolean
  wide?: boolean
}) {
  const backClass = 'inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70 min-h-11'
  const backStyle = { color: dark ? 'var(--color-on-deep-soft)' : 'var(--color-ink-soft)' }
  return (
    <div className="px-4 pt-4">
      <header
        className={cn(
          'flex items-center justify-between px-5 py-2 mx-auto rounded-full',
          wide ? 'max-w-285' : 'max-w-lg',
          dark ? 'border border-white/15 backdrop-blur-xl' : 'pill-nav',
        )}
        style={dark ? { background: 'rgba(255,255,255,0.08)' } : undefined}
      >
        {onBack ? (
          <button onClick={onBack} className={backClass} style={backStyle}>
            <ArrowLeft size={16} aria-hidden />
            {backLabel}
          </button>
        ) : backTo ? (
          // AppHeader receives already-resolved paths, so bypass Link's typed route union
          <Link to={backTo as never} className={backClass} style={backStyle}>
            <ArrowLeft size={16} aria-hidden />
            {backLabel}
          </Link>
        ) : (
          <span />
        )}
        <Link to="/" aria-label="Bond home" className="transition-opacity hover:opacity-80">
          <Wordmark dark={dark} className="text-lg" />
        </Link>
      </header>
    </div>
  )
}

export function Spinner({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="rounded-full"
      style={{
        width: size,
        height: size,
        border: `3px solid ${dark ? 'rgba(255,255,255,0.2)' : 'var(--color-line)'}`,
        borderTopColor: 'var(--color-sunrise)',
        animation: 'spin .8s linear infinite',
      }}
    />
  )
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const letter = name?.trim().at(0)?.toUpperCase() ?? '?'
  const cls = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-20 h-20 text-3xl' }[size]
  return (
    <div
      aria-hidden
      className={cn(cls, 'rounded-full flex items-center justify-center font-display font-bold shrink-0', className)}
      style={{ background: '#dcebf4', color: 'var(--color-blueberry)' }}
    >
      {letter}
    </div>
  )
}

/* A glossy pill CTA — the orange gradient shimmers continuously (not
   just on hover) via an alternating background-position animation, with
   an outer orange glow and inset highlight/shadow pair for a slightly
   3D, glossy surface. Renders as a Link when `to` is given, otherwise a
   plain button. Sizing/gradient/shadow all live in the .shiny-button
   CSS class in styles.css — the same "class does the visual work,
   component just picks Link vs button" split as WaveButton. */
export function ShinyButton({
  children,
  to,
  onClick,
  type = 'button',
  disabled,
  className,
}: {
  children: React.ReactNode
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const classes = cn('shiny-button', className)
  if (to) {
    return (
      <Link to={to as never} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}

/* Scroll-triggered reveal — transform/opacity only */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
