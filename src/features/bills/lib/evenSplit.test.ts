import { describe, expect, it } from 'vitest'
import { evenSplit } from './evenSplit'

const sumCents = (shares: string[]) =>
  shares.reduce((acc, s) => acc + Math.round(parseFloat(s) * 100), 0)

describe('evenSplit', () => {
  it('splits an even total equally', () => {
    expect(evenSplit(90, 3)).toEqual(['30.00', '30.00', '30.00'])
  })

  it('gives the leftover cents to the first people', () => {
    expect(evenSplit(100, 3)).toEqual(['33.34', '33.33', '33.33'])
  })

  it('always sums back to the exact total', () => {
    for (const [total, n] of [
      [86.4, 5],
      [0.05, 3],
      [19.99, 7],
      [100, 6],
    ] as const) {
      expect(sumCents(evenSplit(total, n))).toBe(Math.round(total * 100))
    }
  })

  it('handles a single person', () => {
    expect(evenSplit(42.5, 1)).toEqual(['42.50'])
  })

  it('is not thrown off by floating-point totals', () => {
    // 0.1 + 0.2 style inputs: 29.03 * 100 = 2902.9999… without the rounding
    expect(evenSplit(29.03, 2)).toEqual(['14.52', '14.51'])
  })
})
