// The single orchestrator named in ARCHITECTURE.md's data-flow diagram:
// `computeClocks(facts, todayIST) → ClockBoard`, exposed here as
// `computeClockBoard`. Composes gateA and the four clocks in the exact order
// already proven correct scenario-by-scenario in test/table.test.ts and in
// all three fixtures — this file adds no new sequencing logic of its own,
// only wires the pieces together (§6: zero deps, zero I/O).
//
// The sequencing this replicates:
// - gateA runs first, always.
// - If gateA is NOT_A_138_CASE (legallyEnforceableDebt === 'no'), the chain
//   stops there — T19: "No clock1 computed at all."
// - If gateA is NEEDS_REVIEW because the dishonour reason itself is in
//   question (not because the debt is merely 'unsure'), §3 Gate A branch 3
//   says "stop advancing; still show Clock 1 for information" — T17 computes
//   clock1 but passes null for clock2/3/4. The 'unsure'-debt NEEDS_REVIEW
//   case is different: §3 Gate A branch 2 says "continue computing clocks
//   for information," and needs-review.json (an 'unsure' case) carries a
//   full board through clock4 — so the distinguishing signal has to be
//   `facts.legallyEnforceableDebt === 'unsure'` itself (the same fact that
//   drives `provisional`), not gateA.status alone, since both branches report
//   the same 'NEEDS_REVIEW' status.
// - Otherwise clock1 runs. If clock1 is NOT_A_138_CASE (stale at
//   presentation, T15), the cheque cannot support a complaint at all and the
//   chain stops there too — clock2 stays null.
// - clock2 always runs when nothing above stopped the chain.
// - clock3 runs only when clock2.status === 'PASS' — a notice was actually
//   sent and validated in time. clock2's 'live', 'DEADLINE_MISSED' and
//   'NEEDS_REVIEW' branches never reach clock3 (act-now.json and
//   deadline-missed.json both carry clock3: null).
// - clock4 runs only once clock3 has a *fixed* cause-of-action date, i.e.
//   clock3.status === 'PASS' — never off the advisory NEEDS_REVIEW variant
//   (T25's advisory branch never invents a fixed date to feed Clock 4).

import type { ISODate } from './dates.js'
import { computeClock1, computeClock2, computeClock3, computeClock4, computeGateA } from './clocks.js'
import { computeOverallStatus } from './status.js'
import type { CaseFacts, Clock2Result, ClockBoard } from './types.js'

export function computeClockBoard(facts: CaseFacts, today: ISODate, caseId: string): ClockBoard {
  const gateA = computeGateA(facts)
  const provisional = facts.legallyEnforceableDebt === 'unsure'

  if (gateA.status === 'NOT_A_138_CASE') {
    return {
      caseId,
      computedAt: today,
      today,
      facts,
      overallStatus: computeOverallStatus(today, gateA, null, null, null, null),
      provisional,
      gateA,
      clock1: null,
      clock2: null,
      clock3: null,
      clock4: null,
    }
  }

  const clock1 = computeClock1(facts, today)

  // §3 Gate A branch 3 ("anything else" dishonour reason): stop advancing
  // past Clock 1. Branch 2 (debt 'unsure') keeps going — that's `provisional`.
  const gateAStoppedAdvancing = gateA.status === 'NEEDS_REVIEW' && !provisional

  const clock2: Clock2Result | null =
    gateAStoppedAdvancing || clock1.status === 'NOT_A_138_CASE' ? null : computeClock2(facts, today)

  const clock3 = clock2?.status === 'PASS' ? computeClock3(facts, today) : null
  const clock4 = clock3?.status === 'PASS' ? computeClock4(facts, today, clock3.causeOfActionDate.date) : null

  return {
    caseId,
    computedAt: today,
    today,
    facts,
    overallStatus: computeOverallStatus(today, gateA, clock1, clock2, clock3, clock4),
    provisional,
    gateA,
    clock1,
    clock2,
    clock3,
    clock4,
  }
}
