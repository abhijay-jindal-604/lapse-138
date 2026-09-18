// Overall status precedence (§4). Pure function: walks Gate A and the four
// clocks and applies the fixed precedence order, highest first. No I/O, no
// Date object (§6).
//
// Clock4's 'PREMATURE' status is not a seventh OverallStatus member — it maps
// to NEEDS_REVIEW here (resolved during M1-T2 review; see LEGAL_RULES.md §4
// and the comment on OverallStatus in types.ts). Do not reopen that.

import { diffDays, type ISODate } from './dates.js'
import type {
  Clock1Result,
  Clock2Result,
  Clock3Result,
  Clock4Result,
  GateAResult,
  OverallStatus,
} from './types.js'

export function computeOverallStatus(
  today: ISODate,
  gateA: GateAResult,
  clock1: Clock1Result | null,
  clock2: Clock2Result | null,
  clock3: Clock3Result | null,
  clock4: Clock4Result | null,
): OverallStatus {
  if (gateA.status === 'NOT_A_138_CASE') return 'NOT_A_138_CASE'
  if (clock1?.status === 'NOT_A_138_CASE') return 'NOT_A_138_CASE'

  if (clock3?.status === 'RESOLVED') return 'RESOLVED'

  const needsReview =
    gateA.status === 'NEEDS_REVIEW' ||
    clock2?.status === 'NEEDS_REVIEW' ||
    clock3?.status === 'NEEDS_REVIEW' ||
    clock4?.status === 'PREMATURE'
  if (needsReview) return 'NEEDS_REVIEW'

  const deadlineMissed = clock2?.status === 'DEADLINE_MISSED' || clock4?.status === 'DEADLINE_MISSED'
  if (deadlineMissed) return 'DEADLINE_MISSED'

  // ACT_NOW vs ON_TRACK is decided by days-remaining on whichever deadlines
  // are actually live, not by mirroring a clock's own status name — Clock1's
  // status is literally called 'ACT_NOW' regardless of how far off the
  // presentation deadline is, so it needs the same day-count test as the rest.
  const liveDaysRemaining: number[] = []
  if (clock1?.status === 'ACT_NOW') {
    liveDaysRemaining.push(diffDays(today, clock1.lastValidPresentationDate))
  }
  if (clock2?.status === 'live') liveDaysRemaining.push(clock2.daysRemaining)
  if (clock3?.status === 'live') liveDaysRemaining.push(clock3.daysRemaining)
  if (clock4?.status === 'live') liveDaysRemaining.push(clock4.daysRemaining)

  if (liveDaysRemaining.some((days) => days <= 7)) return 'ACT_NOW'

  return 'ON_TRACK'
}
