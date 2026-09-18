import { describe, expect, it } from 'vitest'
import { addDays, addMonths, compare, diffDays, todayInIST } from '../src/index.js'

// Tests named T05-T09 correspond directly to LEGAL_RULES.md §5's test table.
describe('addDays', () => {
  it('T05: trigger-day exclusion — info received 2026-09-01, deadline is 2026-10-01, not 2026-09-30', () => {
    expect(addDays('2026-09-01', 30)).toBe('2026-10-01')
  })

  it('T06: 15-day window, exclusion — notice received 2026-09-01, window ends 2026-09-16', () => {
    const windowEnds = addDays('2026-09-01', 15)
    expect(windowEnds).toBe('2026-09-16')
    expect(addDays(windowEnds, 1)).toBe('2026-09-17') // causeOfActionDate
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-20', 15)).toBe('2027-01-04')
  })

  it('supports negative offsets', () => {
    expect(addDays('2026-09-10', -10)).toBe('2026-08-31')
  })

  it('is a no-op for zero days', () => {
    expect(addDays('2026-09-10', 0)).toBe('2026-09-10')
  })
})

describe('addMonths', () => {
  it('T07: one-month filing window — cause of action 2026-09-17, filing deadline 2026-10-17', () => {
    expect(addMonths('2026-09-17', 1)).toBe('2026-10-17')
  })

  it('T08: month-end clamping — cause of action 2026-01-31, filing deadline 2026-02-28', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('T09: leap-year clamping — cause of action 2028-01-31, filing deadline 2028-02-29', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('clamps 3-month cheque validity across a leap-year February', () => {
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29')
  })

  it('crosses a year boundary', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('does not clamp when the target month has enough days', () => {
    expect(addMonths('2026-05-31', 1)).toBe('2026-06-30')
  })
})

describe('diffDays', () => {
  it('T01: days remaining to a notice deadline — today 2026-09-10, deadline 2026-10-01, 21 days left', () => {
    expect(diffDays('2026-09-10', '2026-10-01')).toBe(21)
  })

  it('is zero for the same date', () => {
    expect(diffDays('2026-09-17', '2026-09-17')).toBe(0)
  })

  it('is negative when `to` is before `from`', () => {
    expect(diffDays('2026-09-18', '2026-09-17')).toBe(-1)
  })
})

describe('compare', () => {
  it('orders an earlier date before a later one', () => {
    expect(compare('2026-09-01', '2026-09-02')).toBe(-1)
  })

  it('orders a later date after an earlier one', () => {
    expect(compare('2026-09-02', '2026-09-01')).toBe(1)
  })

  it('T24: today equal to the deadline counts as equal, not missed', () => {
    expect(compare('2026-09-17', '2026-09-17')).toBe(0)
  })
})

describe('todayInIST', () => {
  it('returns an ISO YYYY-MM-DD string', () => {
    expect(todayInIST()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
