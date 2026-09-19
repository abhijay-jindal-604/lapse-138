import { Type } from '@google/genai'
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai'
import type { DishonourReason } from '@lapse/rules'
import type { ExtractedFacts, ExtractedField } from './types.js'

// Flash tier: fast/cheap multimodal, same role Haiku 4.5 was going to play
// before D-27 moved extraction off Bedrock. gemini-2.5-flash was retired for
// new callers as of this build (confirmed live against the API 2026-09-19);
// the API's own 404 pointed at this replacement.
export const MODEL = 'gemini-3.6-flash'

const DISHONOUR_REASONS: DishonourReason[] = [
  'insufficient_funds',
  'exceeds_arrangement',
  'account_closed',
  'stop_payment',
  'signature_mismatch',
  'material_alteration',
  'frozen_account',
  'refer_to_drawer',
  'other',
]

const PROMPT = `You are extracting facts from an Indian cheque dishonour / bank return memo for \
a Section 138 Negotiable Instruments Act deadline calculator. Read the attached document and \
extract ONLY the following eight fields, each as an object with "value", "confidence" (a \
number from 0 to 1 reflecting how certain you are), and "sourceQuote" (the exact text from the \
document you read the value from, verbatim).

- chequeNumber: the cheque number, as printed
- chequeDate: the date written on the cheque, ISO 8601 (YYYY-MM-DD)
- amountInPaise: the cheque amount converted to an integer number of paise (multiply rupees by \
100; e.g. Rs 50,000.00 is 5000000). Never a float, never a formatted string.
- drawerBankName: the drawer's (cheque issuer's) bank name
- drawerBankBranch: the drawer's bank branch
- presentationDate: the date the cheque was presented for payment, ISO 8601, or omitted if not \
stated
- dishonourMemoDate: the date on the dishonour/return memo itself, ISO 8601, or omitted if not \
stated
- dishonourReason: one of exactly these values — insufficient_funds, exceeds_arrangement, \
account_closed, stop_payment, signature_mismatch, material_alteration, frozen_account, \
refer_to_drawer, other. Map the memo's stated reason to the closest one; never invent a value \
outside this list.

If a field is not present in the document, omit it entirely — do not guess or default a value.

Do NOT extract, infer, or return any other field. In particular, never return dates for when \
the payee's bank received dishonour information, when a legal notice was sent or received, how \
notice was served, whether the underlying debt is legally enforceable, payment status, how many \
times the cheque was presented, or any contact detail (email, phone, messaging handle) for the \
drawer — those are outside this document's scope and are handled elsewhere in the product.`

function fieldSchema(valueType: Type, enumValues?: string[]) {
  return {
    type: Type.OBJECT,
    nullable: true,
    properties: {
      value: enumValues ? { type: valueType, enum: enumValues } : { type: valueType },
      confidence: { type: Type.NUMBER },
      sourceQuote: { type: Type.STRING },
    },
    required: ['value', 'confidence', 'sourceQuote'],
  }
}

// Mirrors ExtractedFacts exactly — eight keys, nothing else. This is the
// first layer of the by-construction boundary: Gemini's structured-output
// mode is constrained to this shape, so the nine excluded fields have no
// slot to be returned in even if the model tried.
export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chequeNumber: fieldSchema(Type.STRING),
    chequeDate: fieldSchema(Type.STRING),
    amountInPaise: fieldSchema(Type.INTEGER),
    drawerBankName: fieldSchema(Type.STRING),
    drawerBankBranch: fieldSchema(Type.STRING),
    presentationDate: fieldSchema(Type.STRING),
    dishonourMemoDate: fieldSchema(Type.STRING),
    dishonourReason: fieldSchema(Type.STRING, DISHONOUR_REASONS),
  },
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function pickField<T>(raw: unknown, parseValue: (value: unknown) => T | null): ExtractedField<T> | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { value, confidence, sourceQuote } = raw as Record<string, unknown>
  const parsedValue = parseValue(value)
  if (parsedValue === null || typeof sourceQuote !== 'string' || sourceQuote.trim() === '') {
    return null
  }
  const parsedConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0
  return { value: parsedValue, confidence: parsedConfidence, sourceQuote }
}

function parseNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function parseISODate(value: unknown): string | null {
  return typeof value === 'string' && ISO_DATE.test(value) ? value : null
}

function parseAmountInPaise(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

function parseDishonourReason(value: unknown): DishonourReason | null {
  return typeof value === 'string' && (DISHONOUR_REASONS as string[]).includes(value)
    ? (value as DishonourReason)
    : null
}

// Reads only these eight named keys off the model's raw JSON — any other key
// the model returned (a hallucinated ninth field, an excluded field, a typo)
// is never looked at, so it cannot reach the returned value.
function pickKnownFields(raw: Record<string, unknown>): ExtractedFacts {
  return {
    chequeNumber: pickField(raw.chequeNumber, parseNonEmptyString),
    chequeDate: pickField(raw.chequeDate, parseISODate),
    amountInPaise: pickField(raw.amountInPaise, parseAmountInPaise),
    drawerBankName: pickField(raw.drawerBankName, parseNonEmptyString),
    drawerBankBranch: pickField(raw.drawerBankBranch, parseNonEmptyString),
    presentationDate: pickField(raw.presentationDate, parseISODate),
    dishonourMemoDate: pickField(raw.dishonourMemoDate, parseISODate),
    dishonourReason: pickField(raw.dishonourReason, parseDishonourReason),
  }
}

export type GenerateContentFn = (
  args: GenerateContentParameters,
) => Promise<Pick<GenerateContentResponse, 'text'>>

export async function extractFactsFromDocument(
  { mimeType, base64Data }: { mimeType: string; base64Data: string },
  generateContent: GenerateContentFn,
): Promise<ExtractedFacts> {
  const response = await generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64Data } }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  if (!response.text) {
    throw new Error('Gemini returned no text in its response')
  }

  const raw = JSON.parse(response.text) as Record<string, unknown>
  return pickKnownFields(raw)
}
