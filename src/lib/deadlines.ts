// M4-T3: the dashboard needs a single "next deadline" per case to sort and
// display by. There is deliberately no such field on ClockBoard (types.ts
// says why — the reasoning-chain drift risk applies here too), so this walks
// the same clock statuses computeOverallStatus does (packages/rules/src/status.ts)
// and picks whichever live/missed deadline is soonest. Pure, UI-only, derived
// from the published ClockBoard shape — no packages/rules change needed.
import type { ClockBoard, ISODate } from '@lapse/rules'
import { diffDays } from '@lapse/rules'

export type NextDeadline = {
  date: ISODate
  daysRemaining: number // negative once the deadline has passed
  isMissed: boolean
}

export function getNextDeadline(board: ClockBoard): NextDeadline | null {
  const { today, clock1, clock2, clock3, clock4 } = board
  const candidates: NextDeadline[] = []

  if (clock1?.status === 'ACT_NOW') {
    candidates.push({
      date: clock1.lastValidPresentationDate,
      daysRemaining: diffDays(today, clock1.lastValidPresentationDate),
      isMissed: false,
    })
  }
  if (clock2?.status === 'live') {
    candidates.push({ date: clock2.noticeDeadline, daysRemaining: clock2.daysRemaining, isMissed: false })
  }
  if (clock2?.status === 'DEADLINE_MISSED') {
    candidates.push({
      date: clock2.noticeDeadline,
      daysRemaining: diffDays(today, clock2.noticeDeadline),
      isMissed: true,
    })
  }
  if (clock3?.status === 'live') {
    candidates.push({
      date: clock3.paymentWindowEnds.date,
      daysRemaining: clock3.daysRemaining,
      isMissed: false,
    })
  }
  if (clock4?.status === 'live') {
    candidates.push({ date: clock4.filingDeadline, daysRemaining: clock4.daysRemaining, isMissed: false })
  }
  if (clock4?.status === 'not_yet_open') {
    candidates.push({
      date: clock4.filingDeadline,
      daysRemaining: diffDays(today, clock4.filingDeadline),
      isMissed: false,
    })
  }
  if (clock4?.status === 'DEADLINE_MISSED') {
    candidates.push({
      date: clock4.filingDeadline,
      daysRemaining: diffDays(today, clock4.filingDeadline),
      isMissed: true,
    })
  }

  if (candidates.length === 0) return null
  return candidates.reduce((soonest, c) => (c.daysRemaining < soonest.daysRemaining ? c : soonest))
}
