import { describe, expect, it } from 'vitest'
import { extractFactsFromDocument, MODEL, RESPONSE_SCHEMA } from './extract'
import type { GenerateContentFn } from './extract'

// M3-T1: the Gemini call + structured-output parsing only. M3-T2 (handler.ts)
// adds its own unit test for the runtime boundary enforcement (drop-without-
// sourceQuote, strip-the-nine-excluded-fields) — these tests cover that
// extract.ts already can't construct those nine fields, and behaves sanely
// on well- and mal-formed model output.

function stubGeminiText(text: string): GenerateContentFn {
  return async () => ({ text })
}

const HAPPY_PATH_RESPONSE = {
  chequeNumber: { value: '004521', confidence: 0.95, sourceQuote: 'Cheque No. 004521' },
  chequeDate: { value: '2026-06-01', confidence: 0.9, sourceQuote: 'Dated 01-06-2026' },
  amountInPaise: { value: 5000000, confidence: 0.92, sourceQuote: 'Rs. 50,000.00' },
  drawerBankName: { value: 'Sunrise Cooperative Bank', confidence: 0.88, sourceQuote: 'Sunrise Cooperative Bank' },
  drawerBankBranch: { value: 'Church Street Branch', confidence: 0.85, sourceQuote: 'Church Street Branch' },
  presentationDate: { value: '2026-07-20', confidence: 0.8, sourceQuote: 'Presented on 20-07-2026' },
  dishonourMemoDate: { value: '2026-07-28', confidence: 0.9, sourceQuote: 'Memo dated 28-07-2026' },
  dishonourReason: { value: 'insufficient_funds', confidence: 0.97, sourceQuote: 'Funds Insufficient' },
}

describe('extractFactsFromDocument', () => {
  it('parses a well-formed Gemini response into all eight fields', async () => {
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(HAPPY_PATH_RESPONSE)),
    )

    expect(facts.chequeNumber).toEqual({ value: '004521', confidence: 0.95, sourceQuote: 'Cheque No. 004521' })
    expect(facts.amountInPaise?.value).toBe(5000000)
    expect(facts.dishonourReason?.value).toBe('insufficient_funds')
  })

  it('passes the model/schema shape Gemini expects', async () => {
    let capturedModel = ''
    let capturedSchema: unknown
    const generateContent: GenerateContentFn = async (args) => {
      capturedModel = args.model
      capturedSchema = (args.config as { responseSchema: unknown }).responseSchema
      return { text: JSON.stringify(HAPPY_PATH_RESPONSE) }
    }
    await extractFactsFromDocument({ mimeType: 'image/jpeg', base64Data: 'ZmFrZQ==' }, generateContent)
    expect(capturedModel).toBe(MODEL)
    expect(capturedSchema).toBe(RESPONSE_SCHEMA)
  })

  it('never returns the six human-only or three affidavit-boundary fields, even if the model tries', async () => {
    const pollutedResponse = {
      ...HAPPY_PATH_RESPONSE,
      bankInfoReceivedDate: { value: '2026-08-01', confidence: 0.9, sourceQuote: 'Received 01-08-2026' },
      noticeReceivedDate: { value: '2026-08-15', confidence: 0.9, sourceQuote: 'Received 15-08-2026' },
      noticeServiceMode: { value: 'received', confidence: 0.9, sourceQuote: 'Delivered' },
      legallyEnforceableDebt: { value: 'yes', confidence: 0.9, sourceQuote: 'For value received' },
      paymentStatus: { value: 'none', confidence: 0.9, sourceQuote: 'No payment' },
      presentationCount: { value: 1, confidence: 0.9, sourceQuote: 'First presentation' },
      accusedEmail: { value: 'drawer@example.com', confidence: 0.9, sourceQuote: 'drawer@example.com' },
      accusedMobile: { value: '+91 98765 43210', confidence: 0.9, sourceQuote: '+91 98765 43210' },
      accusedMessagingDetails: { value: 'WhatsApp: +91 98765 43210', confidence: 0.9, sourceQuote: 'WhatsApp' },
    }

    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(pollutedResponse)),
    )

    const keys = Object.keys(facts)
    expect(keys).toEqual([
      'chequeNumber',
      'chequeDate',
      'amountInPaise',
      'drawerBankName',
      'drawerBankBranch',
      'presentationDate',
      'dishonourMemoDate',
      'dishonourReason',
    ])
    // TypeScript already refuses a nine-field ExtractedFacts at compile time;
    // this asserts the runtime object matches, in case a `as any` cast ever
    // sneaks a stray key past the type checker.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((facts as any).accusedEmail).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((facts as any).noticeReceivedDate).toBeUndefined()
  })

  it('drops a field returned without a sourceQuote', async () => {
    const response = {
      ...HAPPY_PATH_RESPONSE,
      chequeNumber: { value: '004521', confidence: 0.95, sourceQuote: '' },
    }
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(response)),
    )
    expect(facts.chequeNumber).toBeNull()
  })

  it('drops a dishonourReason outside the closed enum instead of inventing one', async () => {
    const response = {
      ...HAPPY_PATH_RESPONSE,
      dishonourReason: { value: 'cheque_expired', confidence: 0.9, sourceQuote: 'Cheque stale' },
    }
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(response)),
    )
    expect(facts.dishonourReason).toBeNull()
  })

  it('rounds a non-integer amount to whole paise, never a float', async () => {
    const response = {
      ...HAPPY_PATH_RESPONSE,
      amountInPaise: { value: 5000000.4, confidence: 0.9, sourceQuote: 'Rs. 50,000.00' },
    }
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(response)),
    )
    expect(facts.amountInPaise?.value).toBe(5000000)
    expect(Number.isInteger(facts.amountInPaise?.value)).toBe(true)
  })

  it('clamps an out-of-range confidence into 0-1', async () => {
    const response = {
      ...HAPPY_PATH_RESPONSE,
      chequeNumber: { value: '004521', confidence: 1.4, sourceQuote: 'Cheque No. 004521' },
    }
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(response)),
    )
    expect(facts.chequeNumber?.confidence).toBe(1)
  })

  it('treats an omitted field as null, not a guess', async () => {
    const { presentationDate: _omit, ...response } = HAPPY_PATH_RESPONSE
    const facts = await extractFactsFromDocument(
      { mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' },
      stubGeminiText(JSON.stringify(response)),
    )
    expect(facts.presentationDate).toBeNull()
  })

  it('throws if Gemini returns no text', async () => {
    await expect(
      extractFactsFromDocument({ mimeType: 'application/pdf', base64Data: 'ZmFrZQ==' }, stubGeminiText('')),
    ).rejects.toThrow('Gemini returned no text')
  })
})
