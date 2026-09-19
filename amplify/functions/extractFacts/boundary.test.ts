import { describe, expect, it } from 'vitest'
import { enforceExtractionBoundary, EXTRACTABLE_FIELDS } from './boundary'

// M3-T2: handler.ts's own boundary enforcement, tested directly against
// enforceExtractionBoundary rather than indirectly through extract.ts (that
// module's own contract is covered by extract.test.ts). This proves the
// handler-layer rule holds even for an input extract.ts would never actually
// produce — e.g. one where the nine excluded fields are present at runtime,
// which is exactly the case a defense-in-depth boundary exists to cover.

const VALID_FIELD = { value: 'x', confidence: 0.9, sourceQuote: 'x appears here' }

function validInputFor(fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field, VALID_FIELD]))
}

describe('enforceExtractionBoundary', () => {
  it('drops a field returned without a sourceQuote', () => {
    const facts = enforceExtractionBoundary({
      ...validInputFor(EXTRACTABLE_FIELDS),
      chequeNumber: { value: '004521', confidence: 0.95, sourceQuote: '' },
    })
    expect(facts.chequeNumber).toBeNull()
  })

  it('drops a field with a missing sourceQuote entirely', () => {
    const facts = enforceExtractionBoundary({
      ...validInputFor(EXTRACTABLE_FIELDS),
      drawerBankName: { value: 'Sunrise Cooperative Bank', confidence: 0.9 },
    })
    expect(facts.drawerBankName).toBeNull()
  })

  it('keeps a field that does carry a non-empty sourceQuote', () => {
    const facts = enforceExtractionBoundary(validInputFor(EXTRACTABLE_FIELDS))
    expect(facts.chequeNumber).toEqual(VALID_FIELD)
  })

  it('strips the six human-only and three affidavit-boundary fields unconditionally, even if present on the input', () => {
    const polluted = {
      ...validInputFor(EXTRACTABLE_FIELDS),
      bankInfoReceivedDate: VALID_FIELD,
      noticeReceivedDate: VALID_FIELD,
      noticeServiceMode: VALID_FIELD,
      legallyEnforceableDebt: VALID_FIELD,
      paymentStatus: VALID_FIELD,
      presentationCount: VALID_FIELD,
      accusedEmail: VALID_FIELD,
      accusedMobile: VALID_FIELD,
      accusedMessagingDetails: VALID_FIELD,
    }

    const facts = enforceExtractionBoundary(polluted)

    expect(Object.keys(facts).sort()).toEqual([...EXTRACTABLE_FIELDS].sort())
    for (const excluded of [
      'bankInfoReceivedDate',
      'noticeReceivedDate',
      'noticeServiceMode',
      'legallyEnforceableDebt',
      'paymentStatus',
      'presentationCount',
      'accusedEmail',
      'accusedMobile',
      'accusedMessagingDetails',
    ]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((facts as any)[excluded]).toBeUndefined()
    }
  })

  it('strips an excluded field even when it also carries a valid sourceQuote (not just when malformed)', () => {
    const facts = enforceExtractionBoundary({
      ...validInputFor(EXTRACTABLE_FIELDS),
      accusedEmail: { value: 'drawer@example.com', confidence: 0.99, sourceQuote: 'drawer@example.com' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((facts as any).accusedEmail).toBeUndefined()
  })

  it('ignores an unrecognised key rather than passing it through', () => {
    const facts = enforceExtractionBoundary({
      ...validInputFor(EXTRACTABLE_FIELDS),
      someHallucinatedField: VALID_FIELD,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((facts as any).someHallucinatedField).toBeUndefined()
  })
})
