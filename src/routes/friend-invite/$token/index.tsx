import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '#/features/auth'
import { getInviterInfo, resolveAndAcceptFriendInvite } from '#/features/friends'

export const Route = createFileRoute('/friend-invite/$token/')({ component: FriendInviteLanding })

function FriendInviteLanding() {
  const { token } = Route.useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [inviterName, setInviterName] = useState<string | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyFriends, setAlreadyFriends] = useState(false)

  useEffect(() => {
    getInviterInfo({ data: { token } })
      .then((info) => setInviterName(info.name))
      .catch((err: Error) => setErrorMsg(err.message))
      .finally(() => setLoadingInfo(false))
  }, [token])

  async function handleAccept() {
    if (!user) return
    setAccepting(true)
    try {
      const result = await resolveAndAcceptFriendInvite({ data: { token, acceptorId: user.id } })
      setAlreadyFriends(result.alreadyFriends)
      setDone(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong, try again.')
    } finally {
      setAccepting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingInfo || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-deep)' }}>
        <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <span className="font-display text-4xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>Bond</span>
        <h1 className="font-display text-2xl font-semibold mt-2" style={{ color: 'var(--color-text-cream)' }}>
          This link isn't working.
        </h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-mist)' }}>
          {errorMsg}
        </p>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-accent-aurora)' }}
          >
            ✓
          </div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
            {alreadyFriends ? 'Already connected.' : `You and ${inviterName} are now friends.`}
          </h1>
          <button
            onClick={() => navigate({ to: '/friends' })}
            className="mt-2 py-3 px-8 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
          >
            View friends
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    const redirectBack = `/friend-invite/${token}`
    return (
      <div
        className="min-h-screen flex flex-col px-6 py-10 max-w-sm mx-auto"
        style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
      >
        <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>Bond</span>

        <motion.div
          className="flex-1 flex flex-col justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
              {inviterName} wants to connect.
            </h1>
            <p className="text-base" style={{ color: 'var(--color-text-mist)' }}>
              Sign up or log in to add them as a friend on Bond.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/signup"
              search={{ redirect: redirectBack } as never}
              className="w-full py-4 rounded-2xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
            >
              Create an account
            </Link>
            <Link
              to="/login"
              search={{ redirect: redirectBack } as never}
              className="w-full py-4 rounded-2xl font-semibold text-sm text-center transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)' }}
            >
              Log in
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Logged in — show accept CTA ────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col px-6 py-10 max-w-sm mx-auto"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>Bond</span>

      <motion.div
        className="flex-1 flex flex-col justify-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
            {inviterName} wants to connect.
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-mist)' }}>
            Add them as a friend to invite them to parties without typing a phone number.
          </p>
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
          style={{
            background: 'var(--color-accent-ember)',
            color: 'var(--color-on-ember)',
            opacity: accepting ? 0.6 : 1,
          }}
        >
          {accepting ? 'Connecting…' : `Add ${inviterName}`}
        </button>
      </motion.div>
    </div>
  )
}
