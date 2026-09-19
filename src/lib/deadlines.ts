// M4-T3: the dashboard needs a single "next deadline" per case to sort and
// display by. There is deliberately no such field on ClockBoard (types.ts
// says why — the reasoning-chain drift risk applies here too), so this walks
// the same clock statuses computeOverallStatus does (packages/rules/src/status.ts)
// and picks whichever live/missed deadline is soonest. Pure, UI-only, derived
// from the published ClockBoard shape — no packages/rules change needed.
import type { ClockBoard, ISODate } from '@lapse/rules'
import { diffDays } from '@lapse/rules'
import { formatDate } from './format'

// The action a case row's day-count is counting down to — purely cosmetic
// (dashboard copy), not a rules-engine concept, so it lives here rather than
// in packages/rules.
export type DeadlineAction = 'present' | 'notice' | 'pay' | 'file'

const ACTION_LABEL: Record<DeadlineAction, string> = {
  present: 'to present',
  notice: 'to send notice',
  pay: 'to pay',
  file: 'to file',
}

export function deadlineActionLabel(action: DeadlineAction): string {
  return ACTION_LABEL[action]
}

export type NextDeadline = {
  date: ISODate
  daysRemaining: number // negative once the deadline has passed
  isMissed: boolean
  action: DeadlineAction
}

export function getNextDeadline(board: ClockBoard): NextDeadline | null {
  const { today, clock1, clock2, clock3, clock4 } = board
  const candidates: NextDeadline[] = []

  if (clock1?.status === 'ACT_NOW') {
    candidates.push({
      date: clock1.lastValidPresentationDate,
      daysRemaining: diffDays(today, clock1.lastValidPresentationDate),
      isMissed: false,
      action: 'present',
    })
  }
  if (clock2?.status === 'live') {
    candidates.push({
      date: clock2.noticeDeadline,
      daysRemaining: clock2.daysRemaining,
      isMissed: false,
      action: 'notice',
    })
  }
  if (clock2?.status === 'DEADLINE_MISSED') {
    candidates.push({
      date: clock2.noticeDeadline,
      daysRemaining: diffDays(today, clock2.noticeDeadline),
      isMissed: true,
      action: 'notice',
    })
  }
  if (clock3?.status === 'live') {
    candidates.push({
      date: clock3.paymentWindowEnds.date,
      daysRemaining: clock3.daysRemaining,
      isMissed: false,
      action: 'pay',
    })
  }
  if (clock4?.status === 'live') {
    candidates.push({
      date: clock4.filingDeadline,
      daysRemaining: clock4.daysRemaining,
      isMissed: false,
      action: 'file',
    })
  }
  if (clock4?.status === 'not_yet_open') {
    candidates.push({
      date: clock4.filingDeadline,
      daysRemaining: diffDays(today, clock4.filingDeadline),
      isMissed: false,
      action: 'file',
    })
  }
  if (clock4?.status === 'DEADLINE_MISSED') {
    candidates.push({
      date: clock4.filingDeadline,
      daysRemaining: diffDays(today, clock4.filingDeadline),
      isMissed: true,
      action: 'file',
    })
  }

  if (candidates.length === 0) return null
  return candidates.reduce((soonest, c) => (c.daysRemaining < soonest.daysRemaining ? c : soonest))
}

// The dashboard's "most urgent" callout wants a call-to-action sentence, not
// just a day count — re-presentation is the one case where the actionable
// next step differs from "the clock that's overdue".
export function getRecoveryHeadline(board: ClockBoard): string | null {
  const { clock2, clock4 } = board
  const path =
    clock2?.status === 'DEADLINE_MISSED'
      ? clock2.recoveryPath
      : clock4?.status === 'DEADLINE_MISSED' || clock4?.status === 'PREMATURE'
        ? clock4.recoveryPath
        : null
  if (!path) return null
  switch (path.kind) {
    case 'RE_PRESENT_CHEQUE':
      return `Re-present the cheque before ${formatDate(path.deadline)}.`
    case 'CONDONE_DELAY':
      return 'An application to condone the delay may be filed — discretionary, not a right.'
    case 'REFILE_SAME_CAUSE':
      return path.timeRemains
        ? `Refile on the same cause of action before ${formatDate(path.filingDeadline)}.`
        : 'Refile on the same cause of action — but that window has already closed.'
    case 'CIVIL_SUIT_ONLY':
      return 'No §138 route remains. A civil suit on the underlying debt is the remaining option.'
  }
}
