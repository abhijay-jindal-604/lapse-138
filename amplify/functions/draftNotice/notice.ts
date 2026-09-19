// M4-T1: drafts the §138 demand notice itself (the document Clock 2's window
// is counting down to), as distinct from M4-T5's synopsis.ts (a document
// filed later, after notice has already gone out).
//
// Same "model only phrases, never supplies facts" boundary the rest of this
// product holds to (LEGAL_RULES.md's reasoning-chain discipline; see also
// TASKS.md S2's identical framing for the "ask the engine" panel). Gemini is
// asked to draft only the narrative recital paragraph — never a date, a
// name, or a figure. Every particular, every date, the 15-day demand and the
// registered-post reminder are assembled deterministically in this file, so
// the acceptance criterion "dates identical to the engine's output" holds by
// construction and does not depend on a free-tier model reproducing a string
// verbatim.

import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai'
import type { CaseFacts, Clock2Result, ClockBoard, DishonourReason, ISODate } from '@lapse/rules'

// Flash tier, same role as extractFacts/extract.ts's MODEL. Keep both in sync
// by hand if Gemini retires this one too — see that file's comment for the
// gemini-2.5-flash → gemini-3.6-flash gotcha hit on 2026-09-19; each
// amplify/functions/* directory stays self-contained (M3-T1 footnote 2), so
// this is a deliberate duplication, not drift.
export const MODEL = 'gemini-3.6-flash'

export const NOTICE_MARKER = 'DRAFT — for review by a qualified advocate'

const REGISTERED_POST_REMINDER =
  'REMINDER: send this notice by Registered Post with Acknowledgement Due (or Speed Post with tracking), and keep the tracking/AD receipt. Clock 3 and the recovery paths in Clock 2 both turn on proof of dispatch and receipt — see LEGAL_RULES.md §3.'

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function dishonourReasonLabel(reason: DishonourReason): string {
  return reason.replace(/_/g, ' ')
}

// Clock 2's own two notice-eligible shapes: notice not yet sent but still in
// window ('live'), or already sent in time ('PASS'). 'NEEDS_REVIEW' (no
// trigger date) and 'DEADLINE_MISSED' (window closed — recoveryPath is the
// right next step, not a fresh notice) are not valid inputs to this module.
export type NoticeEligibleClock2 = Extract<Clock2Result, { status: 'live' | 'PASS' }>

export class NoticeNotDraftableError extends Error {}

// Recomputes nothing itself — computeClockBoard has already run by the time
// this is called (draft.ts). This only decides whether the resulting board
// is one a notice can honestly be drafted from.
export function assertNoticeEligible(board: ClockBoard): { facts: CaseFacts; clock2: NoticeEligibleClock2 } {
  if (board.gateA.status === 'NOT_A_138_CASE') {
    throw new NoticeNotDraftableError(
      `Case ${board.caseId}: legallyEnforceableDebt is 'no' — this is not a §138 case, no notice can be drafted.`,
    )
  }
  const { clock2 } = board
  if (clock2 === null || clock2.status === 'NEEDS_REVIEW') {
    throw new NoticeNotDraftableError(
      `Case ${board.caseId}: no notice-window trigger date on file (bankInfoReceivedDate or dishonourMemoDate) — supply one before drafting a notice.`,
    )
  }
  if (clock2.status === 'DEADLINE_MISSED') {
    throw new NoticeNotDraftableError(
      `Case ${board.caseId}: the 30-day notice window already closed on ${clock2.noticeDeadline} — see recoveryPath instead of drafting a fresh notice.`,
    )
  }
  return { facts: board.facts, clock2 }
}

export type NoticeFixedFacts = {
  today: ISODate
  payeeName: string
  payeeAddress: string
  drawerName: string
  drawerAddress: string
  chequeNumber: string
  chequeDate: ISODate
  amountInPaise: number
  drawerBankName: string
  drawerBankBranch: string
  presentationDate: ISODate | null
  dishonourTriggerDate: ISODate
  dishonourReason: DishonourReason
  noticeDeadline: ISODate
}

export function buildNoticeFixedFacts(
  facts: CaseFacts,
  clock2: NoticeEligibleClock2,
  today: ISODate,
): NoticeFixedFacts {
  // Mirrors computeClock2's own trigger derivation (packages/rules/src/clocks.ts)
  // rather than reading it back out of clock2.reasoning — this clock2 shape is
  // only ever reached once that derivation found a non-null trigger.
  const dishonourTriggerDate = facts.bankInfoReceivedDate ?? facts.dishonourMemoDate
  if (dishonourTriggerDate === null) {
    throw new NoticeNotDraftableError('Unreachable: a notice-eligible clock2 always has a trigger date.')
  }
  return {
    today,
    payeeName: facts.payeeName,
    payeeAddress: facts.payeeAddress,
    drawerName: facts.drawerName,
    drawerAddress: facts.drawerAddress,
    chequeNumber: facts.chequeNumber,
    chequeDate: facts.chequeDate,
    amountInPaise: facts.amountInPaise,
    drawerBankName: facts.drawerBankName,
    drawerBankBranch: facts.drawerBankBranch,
    presentationDate: facts.presentationDate,
    dishonourTriggerDate,
    dishonourReason: facts.dishonourReason,
    noticeDeadline: clock2.noticeDeadline,
  }
}

export function buildNoticePrompt(fixed: NoticeFixedFacts): string {
  return `You are drafting ONLY the narrative recital paragraph(s) of a formal Indian legal demand \
notice under Section 138 of the Negotiable Instruments Act, 1881 — the part that explains, in \
professional legal prose, that a cheque issued by the drawer in discharge of a debt was dishonoured. \
Do not draft a full letter: no salutation, no letterhead, no signature block, no heading, no list of \
particulars, no payment demand, no consequences paragraph — all of those are assembled separately \
around what you write. Write 1-2 short paragraphs only.

Facts you may reference in your prose (do not restate them as a list; weave them into sentences):
- Payee: ${fixed.payeeName}
- Drawer: ${fixed.drawerName}
- Cheque number ${fixed.chequeNumber}, dated ${fixed.chequeDate}, for ${formatRupees(fixed.amountInPaise)}
- Drawn on ${fixed.drawerBankName}, ${fixed.drawerBankBranch}
${fixed.presentationDate ? `- Presented for payment on ${fixed.presentationDate}` : ''}
- Dishonoured; the payee learned of the dishonour on ${fixed.dishonourTriggerDate}
- Reason for dishonour: ${dishonourReasonLabel(fixed.dishonourReason)}

Rules, strictly:
1. Do not invent, compute, or mention any date other than the ones given above. If you need to refer \
to a date, use exactly one of these strings, verbatim.
2. Do not mention a payment deadline, a number of days to pay, or any consequence of non-payment — \
that paragraph is added separately.
3. Do not include your own heading or signature.
4. Plain text only, no markdown.`
}

export type GenerateContentFn = (
  args: GenerateContentParameters,
) => Promise<Pick<GenerateContentResponse, 'text'>>

function assembleNoticeText(fixed: NoticeFixedFacts, recital: string): string {
  const lines = [
    NOTICE_MARKER,
    '',
    'LEGAL NOTICE UNDER SECTION 138, NEGOTIABLE INSTRUMENTS ACT, 1881',
    '',
    `Date: ${fixed.today}`,
    '',
    'To,',
    fixed.drawerName,
    fixed.drawerAddress,
    '',
    'From,',
    fixed.payeeName,
    fixed.payeeAddress,
    '',
    recital.trim(),
    '',
    'CHEQUE PARTICULARS',
    `Cheque number: ${fixed.chequeNumber}`,
    `Cheque date: ${fixed.chequeDate}`,
    `Amount: ${formatRupees(fixed.amountInPaise)}`,
    `Drawee bank: ${fixed.drawerBankName}, ${fixed.drawerBankBranch}`,
    `Presented on: ${fixed.presentationDate ?? 'not provided'}`,
    `Dishonour intimation date: ${fixed.dishonourTriggerDate}`,
    `Reason for dishonour: ${dishonourReasonLabel(fixed.dishonourReason)}`,
    `This notice must be dispatched by: ${fixed.noticeDeadline}`,
    '',
    'DEMAND',
    `You are hereby called upon to pay the said sum of ${formatRupees(fixed.amountInPaise)} within 15 ` +
      '(fifteen) days from the date of receipt of this notice, failing which I/we shall be constrained ' +
      'to initiate proceedings against you under Section 138 of the Negotiable Instruments Act, 1881, ' +
      'both civil and criminal, entirely at your risk as to costs and consequences.',
    '',
    REGISTERED_POST_REMINDER,
  ]
  return lines.join('\n')
}

export async function draftNoticeText(board: ClockBoard, generateContent: GenerateContentFn): Promise<string> {
  const { facts, clock2 } = assertNoticeEligible(board)
  const fixed = buildNoticeFixedFacts(facts, clock2, board.today)

  const response = await generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: buildNoticePrompt(fixed) }] }],
    config: { responseMimeType: 'text/plain' },
  })

  if (!response.text) {
    throw new Error('Gemini returned no text in its response')
  }

  return assembleNoticeText(fixed, response.text)
}
