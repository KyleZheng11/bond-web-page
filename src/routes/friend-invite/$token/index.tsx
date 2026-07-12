import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useAuth } from '#/features/auth'
import { getInviterInfo, resolveAndAcceptFriendInvite } from '#/features/friends'
import { Wordmark, Spinner } from '#/components/ui'

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
      const result = await resolveAndAcceptFriendInvite({ data: { token } })
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
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner size={36} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Wordmark className="text-4xl" />
        <h1 className="display text-2xl mt-2">This link isn't working.</h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-ink-soft)' }}>
          {errorMsg}
        </p>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="dawn-sky min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="dawn-sun dawn-sun-rise" aria-hidden />
        <div className="dawn-horizon" aria-hidden />
        <motion.div
          className="relative z-10 flex flex-col items-center gap-4 text-on-dawn"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-success)' }}
          >
            <Check size={28} aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-bold" style={{ color: '#ffffff', letterSpacing: '-0.02em' }}>
            {alreadyFriends ? 'Already connected.' : `You and ${inviterName} are now friends.`}
          </h1>
          <button
            onClick={() => navigate({ to: '/friends' })}
            className="btn btn-primary mt-2"
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
      <div className="min-h-dvh flex flex-col px-6 py-8 max-w-sm mx-auto">
        <Wordmark className="text-2xl" />

        <motion.div
          className="flex-1 flex flex-col justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-2">
            <h1 className="display text-4xl leading-tight">
              {inviterName} wants to connect.
            </h1>
            <p className="text-base" style={{ color: 'var(--color-ink-soft)' }}>
              Sign up or log in to add them as a friend on Bond.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/signup"
              search={{ redirect: redirectBack } as never}
              className="btn btn-primary w-full py-4 text-sm"
            >
              Create an account
            </Link>
            <Link
              to="/login"
              search={{ redirect: redirectBack } as never}
              className="btn btn-secondary w-full py-4 text-sm"
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
    <div className="min-h-dvh flex flex-col px-6 py-8 max-w-sm mx-auto">
      <Wordmark className="text-2xl" />

      <motion.div
        className="flex-1 flex flex-col justify-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="display text-4xl leading-tight">
            {inviterName} wants to connect.
          </h1>
          <p className="text-base" style={{ color: 'var(--color-ink-soft)' }}>
            Add them as a friend to invite them to parties without typing a phone number.
          </p>
        </div>

        <button onClick={handleAccept} disabled={accepting} className="btn btn-primary w-full py-4 text-base">
          {accepting ? 'Connecting…' : `Add ${inviterName}`}
        </button>
      </motion.div>
    </div>
  )
}
