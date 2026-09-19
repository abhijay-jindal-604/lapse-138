import type { ExtractedFacts } from './types.js'

// M3-T2: the runtime boundary enforcement, split into its own module because
// handler.ts imports '$amplify/env/extract-facts' (a path alias Amplify only
// generates inside a sandbox/deploy), which makes handler.ts itself
// unimportable from a plain vitest run. This module has no such dependency,
// so its contract — the one LEGAL_RULES.md §2/§7 actually cares about — gets
// its own direct unit test instead of an indirect one through extract.ts.

// LEGAL_RULES.md §2, "Fields a document can almost never supply."
const HUMAN_ONLY_FIELDS = [
  'bankInfoReceivedDate',
  'noticeReceivedDate',
  'noticeServiceMode',
  'legallyEnforceableDebt',
  'paymentStatus',
  'presentationCount',
] as const

// LEGAL_RULES.md §7, the affidavit-boundary fields — never extracted, never defaulted.
const AFFIDAVIT_BOUNDARY_FIELDS = ['accusedEmail', 'accusedMobile', 'accusedMessagingDetails'] as const

// The only eight keys a document extraction may ever populate. Anything else
// on the input object — the nine excluded fields above, a hallucinated key, a
// typo — is never read, regardless of what extract.ts (or a future change to
// it) puts on the object.
const EXTRACTABLE_FIELDS = [
  'chequeNumber',
  'chequeDate',
  'amountInPaise',
  'drawerBankName',
  'drawerBankBranch',
  'presentationDate',
  'dishonourMemoDate',
  'dishonourReason',
] as const satisfies readonly (keyof ExtractedFacts)[]

function hasSourceQuote(candidate: unknown): candidate is { sourceQuote: string } {
  if (typeof candidate !== 'object' || candidate === null) return false
  const { sourceQuote } = candidate as Record<string, unknown>
  return typeof sourceQuote === 'string' && sourceQuote.trim() !== ''
}

// Re-applies the extraction boundary at the handler layer, independent of
// whatever extract.ts already guarantees: (1) a field without a non-empty
// sourceQuote is dropped to null, (2) only the eight document-extractable
// fields are ever copied onto the result — the six human-only fields and
// three affidavit-boundary fields have no path onto it, even if present on
// the input.
export function enforceExtractionBoundary(facts: Record<string, unknown>): ExtractedFacts {
  const result: Record<string, unknown> = {}
  for (const field of EXTRACTABLE_FIELDS) {
    const candidate = facts[field]
    result[field] = hasSourceQuote(candidate) ? candidate : null
  }
  return result as ExtractedFacts
}

export { HUMAN_ONLY_FIELDS, AFFIDAVIT_BOUNDARY_FIELDS, EXTRACTABLE_FIELDS }
