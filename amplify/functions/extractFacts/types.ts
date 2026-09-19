import type { DishonourReason } from '@lapse/rules'

export type ExtractedField<T> = {
  value: T
  confidence: number // 0-1
  sourceQuote: string
}

// The eight CaseFacts fields a dishonour memo can actually supply
// (LEGAL_RULES.md §2, "Fields a document can supply"). This type has no keys
// for the six human-only fields (bankInfoReceivedDate, noticeReceivedDate,
// noticeServiceMode, legallyEnforceableDebt, paymentStatus, presentationCount)
// or the three affidavit-boundary fields (accusedEmail, accusedMobile,
// accusedMessagingDetails, §7) — a value that type-checks as ExtractedFacts
// cannot carry any of those nine, regardless of what the model returns.
// M3-T2 adds the runtime enforcement (stripping a model response down to this
// shape, with its own unit test) in handler.ts; this type is what that
// enforcement targets.
export type ExtractedFacts = {
  chequeNumber: ExtractedField<string> | null
  chequeDate: ExtractedField<string> | null
  amountInPaise: ExtractedField<number> | null
  drawerBankName: ExtractedField<string> | null
  drawerBankBranch: ExtractedField<string> | null
  presentationDate: ExtractedField<string> | null
  dishonourMemoDate: ExtractedField<string> | null
  dishonourReason: ExtractedField<DishonourReason> | null
}
