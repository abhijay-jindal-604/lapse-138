import { describe, expect, it } from 'vitest'
import { computeClockBoard, toIntegerPaise } from '../src/index.js'
import type { CaseFacts } from '../src/index.js'
import actNow from '../fixtures/act-now.json'
import deadlineMissed from '../fixtures/deadline-missed.json'
import needsReview from '../fixtures/needs-review.json'

// computeClockBoard is the orchestrator ARCHITECTURE.md names `computeClocks`.
// It must reproduce, byte for byte, the boards already hand-assembled as
// fixtures — those fixtures are themselves the acceptance surface for M1-T8's
// UI and for M2-T1's wiring, so drift here would be silent everywhere else.

describe('computeClockBoard', () => {
  it('reproduces fixtures/act-now.json exactly from its own facts and today', () => {
    const board = computeClockBoard(actNow.facts as CaseFacts, actNow.today as CaseFacts['chequeDate'], actNow.caseId)
    expect(board).toEqual(actNow)
  })

  it('reproduces fixtures/deadline-missed.json exactly from its own facts and today', () => {
    const board = computeClockBoard(
      deadlineMissed.facts as CaseFacts,
      deadlineMissed.today as CaseFacts['chequeDate'],
      deadlineMissed.caseId,
    )
    expect(board).toEqual(deadlineMissed)
  })

  it('reproduces fixtures/needs-review.json exactly from its own facts and today', () => {
    const board = computeClockBoard(
      needsReview.facts as CaseFacts,
      needsReview.today as CaseFacts['chequeDate'],
      needsReview.caseId,
    )
    expect(board).toEqual(needsReview)
  })

  function baseFacts(overrides: Partial<CaseFacts> = {}): CaseFacts {
    return {
      payeeName: 'Anand Traders',
      payeeAddress: '14 MG Road, Pune 411001',
      drawerName: 'Suresh Kumar',
      drawerAddress: '22 Church Street, Pune 411002',
      chequeNumber: '004521',
      chequeDate: '2026-06-01',
      amountInPaise: toIntegerPaise(50000000),
      drawerBankName: 'Sunrise Cooperative Bank',
      drawerBankBranch: 'Church Street Branch',
      payeeBankBranch: 'MG Road Branch',
      presentationDate: '2026-06-05',
      dishonourMemoDate: null,
      bankInfoReceivedDate: null,
      dishonourReason: 'insufficient_funds',
      presentationCount: 1,
      noticeSentDate: null,
      noticeReceivedDate: null,
      noticeServiceMode: 'unknown',
      paymentStatus: 'none',
      paymentDate: null,
      complaintFiledDate: null,
      legallyEnforceableDebt: 'yes',
      interestClaimedInPaise: null,
      accusedEmail: null,
      accusedMobile: null,
      accusedMessagingDetails: null,
      ...overrides,
    }
  }

  it('sets computedAt and today to the injected today, and caseId to the given id', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const board = computeClockBoard(facts, '2026-09-10', 'case-123')
    expect(board.caseId).toBe('case-123')
    expect(board.computedAt).toBe('2026-09-10')
    expect(board.today).toBe('2026-09-10')
  })

  it('T19: legallyEnforceableDebt "no" stops the whole chain at Gate A — no clocks computed', () => {
    const facts = baseFacts({ legallyEnforceableDebt: 'no' })
    const board = computeClockBoard(facts, '2026-09-17', 'case-t19')
    expect(board.gateA.status).toBe('NOT_A_138_CASE')
    expect(board.overallStatus).toBe('NOT_A_138_CASE')
    expect(board.clock1).toBeNull()
    expect(board.clock2).toBeNull()
    expect(board.clock3).toBeNull()
    expect(board.clock4).toBeNull()
  })

  it('T15: a stale cheque at presentation stops the chain after Clock 1 — no notice clock computed', () => {
    const facts = baseFacts({ chequeDate: '2026-01-10', presentationDate: '2026-05-10' })
    const board = computeClockBoard(facts, '2026-09-17', 'case-t15')
    expect(board.clock1?.status).toBe('NOT_A_138_CASE')
    expect(board.overallStatus).toBe('NOT_A_138_CASE')
    expect(board.clock2).toBeNull()
  })

  it('T17: an unreviewed dishonour reason shows Clock 1 for information but stops before Clock 2', () => {
    const facts = baseFacts({ dishonourReason: 'signature_mismatch' })
    const board = computeClockBoard(facts, '2026-09-17', 'case-t17')
    expect(board.gateA.status).toBe('NEEDS_REVIEW')
    expect(board.clock1?.status).toBe('PASS')
    expect(board.clock2).toBeNull()
    expect(board.overallStatus).toBe('NEEDS_REVIEW')
  })

  it('provisional is true iff legallyEnforceableDebt is "unsure", and the chain still runs through to Clock 4', () => {
    const facts = baseFacts({
      legallyEnforceableDebt: 'unsure',
      bankInfoReceivedDate: '2026-08-05',
      noticeSentDate: '2026-08-25',
      noticeReceivedDate: '2026-08-28',
      noticeServiceMode: 'received',
    })
    const board = computeClockBoard(facts, '2026-09-17', 'case-provisional')
    expect(board.provisional).toBe(true)
    expect(board.gateA.status).toBe('NEEDS_REVIEW')
    expect(board.clock2?.status).toBe('PASS')
    expect(board.clock3?.status).toBe('PASS')
    expect(board.clock4).not.toBeNull()
  })

  it('clock3 stays null when clock2 is "live" (notice not yet sent), matching act-now.json', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-20' })
    const board = computeClockBoard(facts, '2026-09-17', 'case-live')
    expect(board.clock2?.status).toBe('live')
    expect(board.clock3).toBeNull()
    expect(board.clock4).toBeNull()
  })

  it('clock4 stays null off the advisory NEEDS_REVIEW variant of clock3 (T25) — never a fixed date from an estimate', () => {
    const facts = baseFacts({
      bankInfoReceivedDate: '2026-08-15',
      noticeSentDate: '2026-09-01',
      noticeReceivedDate: null,
      noticeServiceMode: 'unknown',
    })
    const board = computeClockBoard(facts, '2026-09-17', 'case-t25')
    expect(board.clock2?.status).toBe('PASS')
    expect(board.clock3?.status).toBe('NEEDS_REVIEW')
    expect(board.clock4).toBeNull()
  })
})
