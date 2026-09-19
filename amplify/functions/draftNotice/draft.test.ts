import { describe, expect, it } from 'vitest'
import { toIntegerPaise } from '@lapse/rules'
import type { CaseFacts } from '@lapse/rules'
import { draftNoticeForCase } from './draft'
import type { GenerateContentFn } from './notice'

// M4-T1's core requirement: draftNotice recomputes the clock board
// server-side and never trusts a client-supplied result. `Case` carries
// allow.publicApiKey() (amplify/data/resource.ts), so any client can write a
// tampered `result` directly via Case.update — these tests prove that field
// has zero influence on the drafted notice.

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

const stubGemini: GenerateContentFn = async () => ({ text: 'A drafted recital paragraph.' })

describe('draftNoticeForCase', () => {
  it('ignores a tampered result claiming a false noticeDeadline far in the future', async () => {
    const facts = baseFacts()
    const tamperedResult = {
      overallStatus: 'ON_TRACK',
      clock2: { clock: 'notice_window', status: 'PASS', noticeDeadline: '2099-01-01', assumption: null, reasoning: [] },
    }

    const text = await draftNoticeForCase({ facts, result: tamperedResult }, 'case-1', '2026-06-20', stubGemini)

    // The real deadline, computed from facts by computeClockBoard inside
    // draftNoticeForCase, is bankInfoReceivedDate (2026-06-12) + 30 days.
    expect(text).toContain('This notice must be dispatched by: 2026-07-12')
    expect(text).not.toContain('2099-01-01')
  })

  it('ignores a result that is not even a plausible ClockBoard shape', async () => {
    const facts = baseFacts()
    const record = { facts, result: 'not a clock board at all, just a string a tampered write could leave behind' }

    const text = await draftNoticeForCase(record, 'case-1', '2026-06-20', stubGemini)

    expect(text).toContain('004521')
    expect(text).toContain('This notice must be dispatched by: 2026-07-12')
  })

  it('ignores a tampered result that claims the case is not a §138 case, and drafts anyway from the real facts', async () => {
    const facts = baseFacts() // legallyEnforceableDebt: 'yes'
    const tamperedResult = { overallStatus: 'NOT_A_138_CASE', gateA: { status: 'NOT_A_138_CASE', reasoning: [] } }

    const text = await draftNoticeForCase({ facts, result: tamperedResult }, 'case-1', '2026-06-20', stubGemini)

    expect(text).toContain('LEGAL NOTICE UNDER SECTION 138')
  })

  it('still refuses to draft when the real facts genuinely are not a §138 case, regardless of what result claims', async () => {
    const facts = baseFacts({ legallyEnforceableDebt: 'no' })
    const tamperedResult = { overallStatus: 'ON_TRACK' }

    await expect(
      draftNoticeForCase({ facts, result: tamperedResult }, 'case-1', '2026-06-20', stubGemini),
    ).rejects.toThrow()
  })
})
