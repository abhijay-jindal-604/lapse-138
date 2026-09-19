import { describe, expect, it } from 'vitest'
import { computeClockBoard, toIntegerPaise } from '@lapse/rules'
import type { CaseFacts } from '@lapse/rules'
import {
  MODEL,
  NOTICE_MARKER,
  NoticeNotDraftableError,
  buildNoticePrompt,
  buildNoticeFixedFacts,
  draftNoticeText,
} from './notice'
import type { GenerateContentFn } from './notice'

// M4-T1: the fixed-dates assembly + Gemini prompt/call, tested independently
// of the AppSync/env plumbing (handler.ts) and of the tamper-proof recompute
// boundary (draft.test.ts covers that). Mirrors extractFacts/extract.test.ts's
// injectable-generateContent style.

function baseFacts(overrides: Partial<CaseFacts> = {}): CaseFacts {
  return {
    payeeName: 'Anand Traders',
    payeeAddress: '14 MG Road, Pune 411001',
    drawerName: 'Suresh Kumar',
    drawerAddress: '22 Church Street, Pune 411002',
    chequeNumber: '004521',
    chequeDate: '2026-06-01',
    amountInPaise: toIntegerPaise(5000000),
    drawerBankName: 'Sunrise Cooperative Bank',
    drawerBankBranch: 'Church Street Branch',
    payeeBankBranch: 'MG Road Branch',
    presentationDate: '2026-06-05',
    dishonourMemoDate: '2026-06-10',
    bankInfoReceivedDate: '2026-06-12',
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

function stubGemini(text: string): GenerateContentFn {
  return async () => ({ text })
}

const RECITAL = 'This is a drafted recital paragraph about the transaction and the dishonour.'

describe('draftNoticeText', () => {
  it('refuses when the debt is not legally enforceable', async () => {
    const facts = baseFacts({ legallyEnforceableDebt: 'no' })
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    await expect(draftNoticeText(board, stubGemini(RECITAL))).rejects.toThrow(NoticeNotDraftableError)
  })

  it('refuses when clock2 has no trigger date to run from', async () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: null })
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    expect(board.clock2?.status).toBe('NEEDS_REVIEW')
    await expect(draftNoticeText(board, stubGemini(RECITAL))).rejects.toThrow(NoticeNotDraftableError)
  })

  it('refuses when the 30-day notice window already closed', async () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-08-01', 'case-1') // well past bankInfoReceivedDate + 30
    expect(board.clock2?.status).toBe('DEADLINE_MISSED')
    await expect(draftNoticeText(board, stubGemini(RECITAL))).rejects.toThrow(NoticeNotDraftableError)
  })

  it('drafts a notice carrying the DRAFT header, cheque particulars, the 15-day demand, and the registered-post reminder', async () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    expect(board.clock2?.status).toBe('live')

    const text = await draftNoticeText(board, stubGemini(RECITAL))

    expect(text.startsWith(NOTICE_MARKER)).toBe(true)
    expect(text).toContain('SECTION 138')
    expect(text).toContain('004521')
    expect(text).toContain('2026-06-01')
    expect(text).toContain('₹50,000.00')
    expect(text).toContain('within 15 (fifteen) days')
    expect(text).toContain('Registered Post')
    expect(text).toContain(RECITAL)
  })

  it("embeds the engine's own computed noticeDeadline, not a date the model could have supplied", async () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    if (board.clock2?.status !== 'live') throw new Error('expected live clock2')
    const text = await draftNoticeText(board, stubGemini(RECITAL))
    expect(text).toContain(`This notice must be dispatched by: ${board.clock2.noticeDeadline}`)
    expect(board.clock2.noticeDeadline).toBe('2026-07-12')
  })

  it('throws if Gemini returns no text', async () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    await expect(draftNoticeText(board, stubGemini(''))).rejects.toThrow('Gemini returned no text')
  })

  it('calls Gemini with the MODEL constant and a prompt that forbids inventing dates', async () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    let capturedModel = ''
    let capturedPrompt = ''
    const generateContent: GenerateContentFn = async (args) => {
      capturedModel = args.model
      const contents = args.contents as Array<{ parts: Array<{ text: string }> }>
      capturedPrompt = contents[0].parts[0].text
      return { text: RECITAL }
    }
    await draftNoticeText(board, generateContent)
    expect(capturedModel).toBe(MODEL)
    expect(capturedPrompt).toContain('Do not invent, compute, or mention any date')
    expect(capturedPrompt).toContain('2026-06-01') // chequeDate
    expect(capturedPrompt).toContain('2026-06-12') // dishonourTriggerDate
  })
})

describe('buildNoticePrompt / buildNoticeFixedFacts', () => {
  it('derives the trigger date the same way Clock 2 does: bankInfoReceivedDate over dishonourMemoDate', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-06-12', dishonourMemoDate: '2026-06-10' })
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    if (board.clock2?.status !== 'live') throw new Error('expected live clock2')
    const fixed = buildNoticeFixedFacts(facts, board.clock2, board.today)
    expect(fixed.dishonourTriggerDate).toBe('2026-06-12')
  })

  it('falls back to dishonourMemoDate when bankInfoReceivedDate is absent', () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: '2026-06-10' })
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    if (board.clock2?.status !== 'live') throw new Error('expected live clock2')
    const fixed = buildNoticeFixedFacts(facts, board.clock2, board.today)
    expect(fixed.dishonourTriggerDate).toBe('2026-06-10')
  })

  it('prompt never asks the model to restate the particulars as a list', () => {
    const facts = baseFacts()
    const board = computeClockBoard(facts, '2026-06-20', 'case-1')
    if (board.clock2?.status !== 'live') throw new Error('expected live clock2')
    const fixed = buildNoticeFixedFacts(facts, board.clock2, board.today)
    const prompt = buildNoticePrompt(fixed)
    expect(prompt).toContain('no list of particulars')
    expect(prompt).toContain('no payment demand')
  })
})
