import { createFileRoute } from '@tanstack/react-router'
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
import { AppHeader, Avatar } from '#/components/ui'

export const Route = createFileRoute('/_auth/friends')({ component: Friends })

type Tab = 'search' | 'requests' | 'friends'

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
    <div className="min-h-dvh flex flex-col">
      <div className="max-w-lg md:max-w-285 mx-auto w-full">
        <AppHeader backTo="/home" wide />
      </div>

      <div className="max-w-lg md:max-w-285 mx-auto w-full px-6 pt-2">
        <h1 className="display text-3xl mb-5">Friends</h1>

        {/* Tab bar */}
        <div className="card flex gap-1 p-1 !rounded-full !shadow-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-10 rounded-full text-sm font-semibold cursor-pointer transition-colors"
              style={{
                background: tab === t.id ? 'var(--color-deep)' : 'transparent',
                color: tab === t.id ? '#ffffff' : 'var(--color-ink-soft)',
              }}
            >
              {t.label}
              {t.badge ? (
                <span
                  className="text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-sunrise)', color: 'var(--color-on-sunrise)' }}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 pt-5 pb-10 max-w-lg md:max-w-285 mx-auto w-full flex flex-col gap-4">

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
              className="input"
            />

            {searching && (
              <p className="text-sm text-center" style={{ color: 'var(--color-ink-soft)' }}>
                Searching…
              </p>
            )}

            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-ink-soft)' }}>
                No users found.
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((result) => {
                  const isFriend = friendIds.has(result.id)
                  const isPending = sentToIds.has(result.id)
                  return (
                    <div key={result.id} className="card flex items-center gap-3 px-4 py-3">
                      <Avatar name={result.display_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {result.display_name ?? result.email.split('@')[0]}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                          {result.email}
                        </p>
                      </div>
                      {isFriend ? (
                        <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-success)' }}>
                          Friends
                        </span>
                      ) : isPending ? (
                        <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-ink-soft)' }}>
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(result.id)}
                          className="btn btn-primary shrink-0 !min-h-9 !py-1.5 !px-4 text-xs"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* SMS invite section */}
            <div className="card flex flex-col gap-3 px-5 py-5 mt-2">
              <div className="flex flex-col gap-1">
                <p className="font-display font-semibold text-sm">Invite via SMS</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Share a link — anyone who taps it gets added as your friend.
                </p>
              </div>

              {!inviteLink ? (
                <button onClick={handleGenerateInvite} className="btn btn-dark !rounded-xl py-3 text-sm">
                  Generate invite link
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--color-surface-dim)', border: '1px solid var(--color-line)' }}
                  >
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                      {inviteLink}
                    </span>
                    <button
                      onClick={copyInviteLink}
                      className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-85"
                      style={
                        copied
                          ? { background: 'var(--color-success-soft)', color: 'var(--color-success)' }
                          : { background: 'var(--color-deep)', color: '#ffffff' }
                      }
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button onClick={shareInviteLink} className="btn btn-secondary !rounded-xl py-3 text-sm">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="card py-14 text-center flex flex-col gap-2">
                <p className="display text-xl">No pending requests.</p>
                <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                  When someone adds you, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {requests.map((req) => (
                  <div key={req.friendshipId} className="card flex items-center gap-3 px-4 py-3">
                    <Avatar name={req.displayName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {req.displayName ?? req.email.split('@')[0]}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                        {req.email}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(req.friendshipId, true)}
                        className="btn btn-primary !min-h-9 !py-1.5 !px-4 text-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.friendshipId, false)}
                        className="btn btn-secondary !min-h-9 !py-1.5 !px-4 text-xs"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="card py-14 text-center flex flex-col gap-2">
                <p className="display text-xl">No friends yet.</p>
                <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                  Search for people or send an invite link.
                </p>
                <button
                  onClick={() => setTab('search')}
                  className="mt-2 text-sm font-semibold self-center cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-blueberry)' }}
                >
                  Find friends →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {friends.map((friend) => (
                  <div key={friend.friendshipId} className="card flex items-center gap-3 px-4 py-3">
                    <Avatar name={friend.displayName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {friend.displayName ?? friend.email.split('@')[0]}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                        {friend.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
