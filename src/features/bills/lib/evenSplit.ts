/* Splits a dollar total into n cent-accurate shares. Cents don't always
   divide evenly, so the first (cents % n) people get one extra cent —
   the shares always sum back to the exact total. */
export function evenSplit(total: number, n: number): string[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  const extra = cents % n
  return Array.from({ length: n }, (_, i) =>
    ((base + (i < extra ? 1 : 0)) / 100).toFixed(2),
  )
}
