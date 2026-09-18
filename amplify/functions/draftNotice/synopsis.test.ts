import { describe, expect, it } from 'vitest'
import { computeClock3, toIntegerPaise } from '@lapse/rules'
import type { CaseFacts } from '@lapse/rules'
import { draftSynopsis } from './synopsis'

// M4-T5: the wiring of packages/rules' already-tested computeSynopsis (T27)
// into a model-free text output. This file tests only the new formatting
// logic — the underlying computeSynopsis correctness is packages/rules' job.

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
    dishonourMemoDate: '2026-07-28',
    bankInfoReceivedDate: '2026-08-01',
    dishonourReason: 'insufficient_funds',
    presentationCount: 1,
    noticeSentDate: '2026-08-10',
    noticeReceivedDate: '2026-08-15',
    noticeServiceMode: 'received',
    paymentStatus: 'none',
    paymentDate: null,
    complaintFiledDate: null,
    legallyEnforceableDebt: 'yes',
    interestClaimedInPaise: toIntegerPaise(500000),
    accusedEmail: 'accused@example.com',
    accusedMobile: '+91 98765 43210',
    accusedMessagingDetails: 'WhatsApp: +91 98765 43210',
    ...overrides,
  }
}

describe('draftSynopsis', () => {
  it('carries the DRAFT SYNOPSIS marker as the document header', () => {
    const facts = baseFacts()
    const clock3 = computeClock3(facts, '2026-09-05')
    const { text } = draftSynopsis(facts, clock3)
    expect(text.startsWith('DRAFT SYNOPSIS')).toBe(true)
  })

  it('carries the accused contact particulars through verbatim with the affidavit warning attached', () => {
    const facts = baseFacts()
    const clock3 = computeClock3(facts, '2026-09-05')
    const { text } = draftSynopsis(facts, clock3)
    expect(text).toContain('accused@example.com')
    expect(text).toContain('+91 98765 43210')
    expect(text).toContain('WhatsApp: +91 98765 43210')
    expect(text).toContain('must be filed under an affidavit')
  })

  it('never invents a cause-of-action date before it has accrued', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-01', noticeServiceMode: 'received' })
    const clock3 = computeClock3(facts, '2026-09-05') // still inside the 15-day window
    expect(clock3.status).toBe('live')
    const { text } = draftSynopsis(facts, clock3)
    expect(text).toContain('Cause of action: not yet accrued')
  })

  it('formats the cheque amount as rupees only at this render edge, never upstream', () => {
    const facts = baseFacts()
    const clock3 = computeClock3(facts, '2026-09-05')
    const { text, synopsis } = draftSynopsis(facts, clock3)
    expect(synopsis.chequeParticulars.amountInPaise).toBe(50000000)
    expect(text).toContain('₹5,00,000.00')
  })
})
