// Structured synopsis assembly (§3 "Outputs that are not clocks", mandated by
// Sanjabij Tari v. Kishore S. Borcar, 2025 INSC 1158). A formatting job on
// data already confirmed — every field here is copied from CaseFacts or from
// Clock 3's computed result, never inferred, never generated (§6: no I/O, no
// dependency; this file adds neither).

import type { CaseFacts, Clock3Result, SynopsisResult } from './types.js'

const DRAFT_SYNOPSIS_MARKER = 'DRAFT SYNOPSIS — verify against the prescribed format before filing'

const INTERIM_COMPENSATION_NOTE =
  'Interim compensation of up to 20% of the cheque amount may be sought under NI Act §143A, at the court’s discretion (Rakesh Ranjan Shrivastava v. State of Jharkhand, 2024 INSC 205 — discretionary, not mandatory).'

const AFFIDAVIT_WARNING =
  'These particulars must be filed under an affidavit that they pertain to the accused. Verify them personally — the app does not check, infer, or generate this affidavit, and a false affidavit of service can expose you to court action.'

export function computeSynopsis(facts: CaseFacts, clock3: Clock3Result | null): SynopsisResult {
  const deemed =
    facts.noticeReceivedDate !== null &&
    (facts.noticeServiceMode === 'refused' || facts.noticeServiceMode === 'unclaimed')

  const causeOfAction =
    clock3 !== null && clock3.status === 'PASS'
      ? { date: clock3.causeOfActionDate.date, basis: 'computed' as const }
      : { date: null, basis: 'not_yet_accrued' as const }

  return {
    marker: DRAFT_SYNOPSIS_MARKER,
    partiesParticulars: {
      payeeName: facts.payeeName,
      payeeAddress: facts.payeeAddress,
      drawerName: facts.drawerName,
      drawerAddress: facts.drawerAddress,
    },
    chequeParticulars: {
      chequeNumber: facts.chequeNumber,
      chequeDate: facts.chequeDate,
      amountInPaise: facts.amountInPaise,
      drawerBankName: facts.drawerBankName,
      drawerBankBranch: facts.drawerBankBranch,
      drawerName: facts.drawerName,
      payeeName: facts.payeeName,
    },
    dishonour: {
      presentationDate: facts.presentationDate,
      dishonourDate: facts.dishonourMemoDate,
      dishonourReason: facts.dishonourReason,
    },
    statutoryNotice: {
      dispatchDate: facts.noticeSentDate,
      mode: facts.noticeServiceMode,
      receiptDate: facts.noticeReceivedDate,
      deemed,
      response: facts.paymentStatus,
      responseDate: facts.paymentDate,
    },
    causeOfAction,
    reliefSought: {
      amountInPaise: facts.amountInPaise,
      interestClaimedInPaise: facts.interestClaimedInPaise,
      interimCompensationNote: INTERIM_COMPENSATION_NOTE,
    },
    accusedContactParticulars: {
      accusedEmail: facts.accusedEmail,
      accusedMobile: facts.accusedMobile,
      accusedMessagingDetails: facts.accusedMessagingDetails,
      affidavitWarning: AFFIDAVIT_WARNING,
    },
  }
}
