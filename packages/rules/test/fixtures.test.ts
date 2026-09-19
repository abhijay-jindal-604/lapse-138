import { describe, expect, it } from 'vitest'
import type { ClockBoard } from '../src/index.js'
import actNow from '../fixtures/act-now.json'
import advisoryWindow from '../fixtures/advisory-window.json'
import deadlineMissed from '../fixtures/deadline-missed.json'
import needsReview from '../fixtures/needs-review.json'

// Guards against fixture/type drift: every fixture must satisfy ClockBoard, and
// every clock result the fixture claims to carry must actually carry its
// reasoning chain and (where the status demands it) its recoveryPath.
function checkBoard(board: ClockBoard): void {
  expect(board.gateA.reasoning.length).toBeGreaterThan(0)

  for (const clock of [board.clock1, board.clock2, board.clock3, board.clock4]) {
    if (clock === null) continue
    expect(clock.reasoning.length).toBeGreaterThan(0)
    if (clock.status === 'DEADLINE_MISSED' || clock.status === 'PREMATURE') {
      expect(clock.recoveryPath).toBeTruthy()
    }
  }
}

describe('fixtures satisfy ClockBoard', () => {
  it('act-now.json is ACT_NOW with a live Clock 2 and no provisional flag', () => {
    const board = actNow as ClockBoard
    checkBoard(board)
    expect(board.overallStatus).toBe('ACT_NOW')
    expect(board.provisional).toBe(false)
    expect(board.clock2?.status).toBe('live')
  })

  it('deadline-missed.json is DEADLINE_MISSED with a re-presentation recovery path', () => {
    const board = deadlineMissed as ClockBoard
    checkBoard(board)
    expect(board.overallStatus).toBe('DEADLINE_MISSED')
    expect(board.clock2?.status).toBe('DEADLINE_MISSED')
    if (board.clock2?.status === 'DEADLINE_MISSED') {
      expect(board.clock2.recoveryPath.kind).toBe('RE_PRESENT_CHEQUE')
      expect(board.clock2.assumption).toBeNull()
    }
  })

  it('needs-review.json is NEEDS_REVIEW and provisional, with every clock still computed', () => {
    const board = needsReview as ClockBoard
    checkBoard(board)
    expect(board.overallStatus).toBe('NEEDS_REVIEW')
    expect(board.provisional).toBe(true)
    expect(board.gateA.status).toBe('NEEDS_REVIEW')
    expect(board.clock1).not.toBeNull()
    expect(board.clock2).not.toBeNull()
    expect(board.clock3).not.toBeNull()
    expect(board.clock4).not.toBeNull()
  })

  it('advisory-window.json is NEEDS_REVIEW with clock3 pending_service_confirmation, T25 figures, and no clock4', () => {
    const board = advisoryWindow as ClockBoard
    checkBoard(board)
    expect(board.overallStatus).toBe('NEEDS_REVIEW')
    expect(board.clock2?.status).toBe('PASS')
    expect(board.clock3?.status).toBe('NEEDS_REVIEW')
    if (board.clock3?.status === 'NEEDS_REVIEW' && 'reviewReason' in board.clock3) {
      expect(board.clock3.reviewReason).toBe('pending_service_confirmation')
      expect(board.clock3.paymentWindowEnds.basis).toBe('advisory')
      if (board.clock3.paymentWindowEnds.basis === 'advisory') {
        expect(board.clock3.paymentWindowEnds.earliest).toBe('2026-09-19')
        expect(board.clock3.paymentWindowEnds.latest).toBe('2026-09-23')
      }
    }
    // Mirrors board.test.ts's T25 guard: an advisory clock3 never feeds a fixed
    // date to clock4 — see packages/rules/src/board.ts.
    expect(board.clock4).toBeNull()
  })

  it('overallStatus is always one of the six closed-union values', () => {
    const allowed = ['NOT_A_138_CASE', 'RESOLVED', 'NEEDS_REVIEW', 'DEADLINE_MISSED', 'ACT_NOW', 'ON_TRACK']
    for (const board of [actNow, deadlineMissed, needsReview, advisoryWindow] as ClockBoard[]) {
      expect(allowed).toContain(board.overallStatus)
    }
  })
})
