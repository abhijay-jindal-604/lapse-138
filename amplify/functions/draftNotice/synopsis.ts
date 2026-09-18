// Wires the already-tested synopsis-assembly function (packages/rules T27, see
// LEGAL_RULES.md §3 "Outputs that are not clocks") into draftNotice as a
// model-free path. Nothing in this file calls Bedrock or any other model —
// M4-T5's acceptance criterion is that CloudWatch shows zero invocations for
// this path, which holds trivially because no Bedrock client is imported here.

import { computeSynopsis } from '@lapse/rules'
import type { CaseFacts, Clock3Result, SynopsisResult } from '@lapse/rules'

export type DraftSynopsis = {
  text: string
  synopsis: SynopsisResult
}

export function draftSynopsis(facts: CaseFacts, clock3: Clock3Result | null): DraftSynopsis {
  const synopsis = computeSynopsis(facts, clock3)
  return { text: formatSynopsisText(synopsis), synopsis }
}

// Money is an integer of paise everywhere upstream (LEGAL_RULES.md §6); this
// is the render edge where it becomes a rupee string, and nowhere else.
function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function line(label: string, value: string | null): string {
  return `${label}: ${value ?? 'not provided'}`
}

function formatSynopsisText(synopsis: SynopsisResult): string {
  const {
    partiesParticulars,
    chequeParticulars,
    dishonour,
    statutoryNotice,
    causeOfAction,
    reliefSought,
    accusedContactParticulars,
  } = synopsis

  const causeOfActionLine =
    causeOfAction.basis === 'computed' && causeOfAction.date !== null
      ? line('Cause of action accrued', causeOfAction.date)
      : 'Cause of action: not yet accrued'

  return [
    synopsis.marker,
    '',
    '1. PARTIES',
    line('Payee', `${partiesParticulars.payeeName}, ${partiesParticulars.payeeAddress}`),
    line('Drawer', `${partiesParticulars.drawerName}, ${partiesParticulars.drawerAddress}`),
    '',
    '2. CHEQUE PARTICULARS',
    line('Cheque number', chequeParticulars.chequeNumber),
    line('Cheque date', chequeParticulars.chequeDate),
    line('Amount', formatRupees(chequeParticulars.amountInPaise)),
    line('Drawee bank', `${chequeParticulars.drawerBankName}, ${chequeParticulars.drawerBankBranch}`),
    '',
    '3. DISHONOUR',
    line('Presentation date', dishonour.presentationDate),
    line('Dishonour date', dishonour.dishonourDate),
    line('Reason', dishonour.dishonourReason),
    '',
    '4. STATUTORY NOTICE',
    line('Dispatch date', statutoryNotice.dispatchDate),
    line('Service mode', statutoryNotice.mode),
    line('Receipt date', statutoryNotice.receiptDate),
    line('Deemed service', statutoryNotice.deemed ? 'yes' : 'no'),
    line('Response', statutoryNotice.response),
    line('Response date', statutoryNotice.responseDate),
    '',
    '5. CAUSE OF ACTION',
    causeOfActionLine,
    '',
    '6. RELIEF SOUGHT',
    line('Cheque amount', formatRupees(reliefSought.amountInPaise)),
    line(
      'Interest claimed',
      reliefSought.interestClaimedInPaise !== null ? formatRupees(reliefSought.interestClaimedInPaise) : null,
    ),
    reliefSought.interimCompensationNote,
    '',
    '7. ACCUSED CONTACT PARTICULARS',
    line('Email', accusedContactParticulars.accusedEmail),
    line('Mobile', accusedContactParticulars.accusedMobile),
    line('Messaging details', accusedContactParticulars.accusedMessagingDetails),
    '',
    accusedContactParticulars.affidavitWarning,
  ].join('\n')
}
