import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '#/features/auth'
import {
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  getFriends,
  getFriendRequests,
  generateFriendInvite,
} from '#/features/friends'
import type { Friend, FriendRequest, UserSearchResult } from '#/features/friends'

export const Route = createFileRoute('/_auth/friends')({ component: Friends })

type Tab = 'search' | 'requests' | 'friends'

function Avatar({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' }) {
  const letter = (name ?? '?')[0].toUpperCase()
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-accent-gold)' }}
    >
      {letter}
    </div>
  )
}

function Friends() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('search')

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({})

  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingLists, setLoadingLists] = useState(true)

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getFriendRequests({ data: { userId: user.id } }),
      getFriends({ data: { userId: user.id } }),
    ])
      .then(([reqs, frs]) => {
        setRequests(reqs)
        setFriends(frs)
      })
      .finally(() => setLoadingLists(false))
  }, [user])

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setSearchResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const results = await searchUsers({ data: { query, currentUserId: user.id } })
      setSearchResults(results)
      setSearching(false)
    }, 300)
  }, [query, user])

  async function handleSendRequest(addresseeId: string) {
    if (!user) return
    setPendingRequests((p) => ({ ...p, [addresseeId]: true }))
    try {
      await sendFriendRequest({ data: { requesterId: user.id, addresseeId } })
    } catch {
      setPendingRequests((p) => ({ ...p, [addresseeId]: false }))
    }
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    await respondToFriendRequest({ data: { friendshipId, accept } })
    setRequests((r) => r.filter((req) => req.friendshipId !== friendshipId))
    if (accept && user) {
      const updated = await getFriends({ data: { userId: user.id } })
      setFriends(updated)
    }
  }

  async function handleGenerateInvite() {
    if (!user) return
    const { token } = await generateFriendInvite({ data: { userId: user.id } })
    const link = `${window.location.origin}/friend-invite/${token}`
    setInviteLink(link)
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareInviteLink() {
    if (!inviteLink) return
    const text = `Add me on Bond! ${inviteLink}`
    if (navigator.share) {
      await navigator.share({ title: 'Bond', text, url: inviteLink })
    } else {
      window.open(`sms:&body=${encodeURIComponent(text)}`)
    }
  }

  const friendIds = new Set(friends.map((f) => f.userId))
  const sentToIds = new Set(Object.keys(pendingRequests))

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'search', label: 'Search' },
    { id: 'requests', label: 'Requests', badge: requests.length || undefined },
    { id: 'friends', label: 'Friends', badge: friends.length || undefined },
  ]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-5">
        <Link
          to="/home"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Back
        </Link>
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
          Friends
        </span>
      </header>

      {/* Tab bar */}
      <div
        className="flex gap-1 mx-6 p-1 rounded-2xl"
        style={{ background: 'var(--color-surface-petrol)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'var(--color-surface-twilight)' : 'transparent',
              color: tab === t.id ? 'var(--color-text-cream)' : 'var(--color-text-mist)',
            }}
          >
            {t.label}
            {t.badge ? (
              <span
                className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 pt-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* ── Search tab ── */}
        {tab === 'search' && (
          <motion.div
            key="search"
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-petrol)',
                border: '1px solid rgba(240,228,204,0.08)',
                color: 'var(--color-text-cream)',
              }}
            />

            {searching && (
              <p className="text-sm text-center" style={{ color: 'var(--color-text-mist)' }}>
                Searching…
              </p>
            )}

            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-mist)' }}>
                No users found.
              </p>
            )}

            {searchResults.map((result) => {
              const isFriend = friendIds.has(result.id)
              const isPending = sentToIds.has(result.id)
              return (
                <div
                  key={result.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--color-surface-petrol)' }}
                >
                  <Avatar name={result.display_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-cream)' }}>
                      {result.display_name ?? result.email.split('@')[0]}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                      {result.email}
                    </p>
                  </div>
                  {isFriend ? (
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-accent-gold)' }}>
                      Friends
                    </span>
                  ) : isPending ? (
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text-mist)' }}>
                      Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(result.id)}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}

            {/* SMS invite section */}
            <div
              className="flex flex-col gap-3 px-4 py-4 rounded-2xl mt-2"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                  Invite via SMS
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                  Share a link — anyone who taps it gets added as your friend.
                </p>
              </div>

              {!inviteLink ? (
                <button
                  onClick={handleGenerateInvite}
                  className="py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-cream)' }}
                >
                  Generate invite link
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--color-surface-twilight)' }}
                  >
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                      {inviteLink}
                    </span>
                    <button
                      onClick={copyInviteLink}
                      className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{
                        background: copied ? 'var(--color-surface-petrol)' : 'var(--color-accent-ember)',
                        color: copied ? 'var(--color-text-mist)' : 'var(--color-on-ember)',
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={shareInviteLink}
                    className="py-3 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-cream)' }}
                  >
                    Share
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Requests tab ── */}
        {tab === 'requests' && (
          <motion.div
            key="requests"
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loadingLists ? (
              [1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
              ))
            ) : requests.length === 0 ? (
              <div className="py-16 text-center flex flex-col gap-2">
                <p className="font-display text-xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                  No pending requests.
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                  When someone adds you, they'll appear here.
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.friendshipId}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--color-surface-petrol)' }}
                >
                  <Avatar name={req.displayName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-cream)' }}>
                      {req.displayName ?? req.email.split('@')[0]}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                      {req.email}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRespond(req.friendshipId, true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(req.friendshipId, false)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-mist)' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ── Friends tab ── */}
        {tab === 'friends' && (
          <motion.div
            key="friends"
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loadingLists ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
              ))
            ) : friends.length === 0 ? (
              <div className="py-16 text-center flex flex-col gap-2">
                <p className="font-display text-xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                  No friends yet.
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
                  Search for people or send an invite link.
                </p>
                <button
                  onClick={() => setTab('search')}
                  className="mt-2 text-sm font-semibold self-center"
                  style={{ color: 'var(--color-accent-ember)' }}
                >
                  Find friends →
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--color-surface-petrol)' }}
                >
                  <Avatar name={friend.displayName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-cream)' }}>
                      {friend.displayName ?? friend.email.split('@')[0]}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                      {friend.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
