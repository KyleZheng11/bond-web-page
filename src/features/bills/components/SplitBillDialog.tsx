import { useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { evenSplit } from '../lib/evenSplit'
import type { Tables } from '#/types/database'

type Member = Tables<'party_members'>

/* Builds the text-message body for one member. The Venmo link opens the
   app pre-filled to pay the leader; its own query params get percent-
   encoded again as part of the sms body, which the messaging app undoes
   exactly once — so the link comes out intact. */
function smsHref(params: {
  phone: string | null
  name: string
  restaurant: string
  amount: string
  handle: string
}): string {
  const { phone, name, restaurant, amount, handle } = params
  const note = encodeURIComponent(`Dinner at ${restaurant}`)
  const venmoLink = `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${note}`
  const body = `Hey ${name}! Your share of dinner at ${restaurant} is $${amount} — pay me on Venmo: ${venmoLink}`
  // "?&body=" is the one separator both iOS and Android accept
  return `sms:${phone ?? ''}?&body=${encodeURIComponent(body)}`
}

export function SplitBillDialog({
  restaurantName,
  members,
  currentUserId,
  onClose,
}: {
  restaurantName: string
  members: Member[]
  currentUserId: string
  onClose: () => void
}) {
  const [total, setTotal] = useState('')
  const [handle, setHandle] = useState('')
  // Amounts are kept as strings so partial input ("12.") doesn't fight
  // the user while typing; parsed only when building links / the sum.
  const [amounts, setAmounts] = useState<string[]>(() =>
    members.map(() => ''),
  )

  const cleanHandle = handle.trim().replace(/^@/, '')
  const totalNum = parseFloat(total)
  const sumCents = amounts.reduce((acc, a) => {
    const n = parseFloat(a)
    return acc + (Number.isFinite(n) ? Math.round(n * 100) : 0)
  }, 0)
  const diffCents = Number.isFinite(totalNum)
    ? Math.round(totalNum * 100) - sumCents
    : 0

  function applyTotal(value: string) {
    setTotal(value)
    const n = parseFloat(value)
    // Re-splitting on every total change overwrites manual edits, but
    // that's the flow: set the total first, then fine-tune per person.
    if (Number.isFinite(n) && n > 0) {
      setAmounts(evenSplit(n, members.length))
    }
  }

  function setAmount(index: number, value: string) {
    setAmounts((prev) => prev.map((a, i) => (i === index ? value : a)))
  }

  const ready = cleanHandle.length > 0 && Number.isFinite(totalNum) && totalNum > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(11, 15, 20, 0.4)' }}
      />

      <div className="card relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto flex flex-col gap-5 p-6 rounded-b-none sm:rounded-b-[20px]">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-display font-bold text-xl leading-tight">
              Split the bill
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              {restaurantName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 transition-opacity hover:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Bill total</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="86.40"
            value={total}
            onChange={(e) => applyTotal(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Your Venmo username</span>
          <input
            className="input"
            type="text"
            placeholder="@your-venmo"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Each person owes</span>
            {diffCents !== 0 && ready && (
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-sunrise)' }}
              >
                {diffCents > 0
                  ? `$${(diffCents / 100).toFixed(2)} left to assign`
                  : `$${(-diffCents / 100).toFixed(2)} over the total`}
              </span>
            )}
          </div>

          {members.map((m, i) => {
            const isSelf = m.user_id === currentUserId
            const name = m.guest_name ?? 'Guest'
            const amount = parseFloat(amounts[i])
            const canText = ready && Number.isFinite(amount) && amount > 0 && !isSelf
            return (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-sm font-medium flex-1 truncate">
                  {isSelf ? 'You' : name}
                </span>
                <div className="relative w-24">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--color-ink-soft)' }}
                  >
                    $
                  </span>
                  <input
                    className="input pl-7 text-right"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amounts[i]}
                    onChange={(e) => setAmount(i, e.target.value)}
                  />
                </div>
                {isSelf ? (
                  /* Spacer keeps the amount inputs in one column */
                  <span className="w-[4.5rem]" aria-hidden />
                ) : (
                  <a
                    href={
                      canText
                        ? smsHref({
                            phone: m.phone_number,
                            name,
                            restaurant: restaurantName,
                            amount: amount.toFixed(2),
                            handle: cleanHandle,
                          })
                        : undefined
                    }
                    aria-disabled={!canText}
                    className={`btn btn-secondary w-[4.5rem] py-2 text-xs ${canText ? '' : 'opacity-45 pointer-events-none'}`}
                  >
                    <MessageSquare size={13} aria-hidden />
                    Text
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
          Each text opens in your messaging app with the amount and a Venmo
          link pre-filled — hit send and they can pay you in one tap.
        </p>
      </div>
    </div>
  )
}
