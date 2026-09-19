import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GoogleGenAI } from '@google/genai'
import type { Schema } from '../../data/resource'
import { env } from '$amplify/env/extract-facts'
import { extractFactsFromDocument } from './extract'
import { enforceExtractionBoundary } from './boundary'

const s3 = new S3Client({})

function mimeTypeFromKey(key: string): string {
  return key.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
}

// M3-T2: extractFactsFromDocument already returns only the ExtractedFacts
// shape (types.ts) with sourceQuote-less fields dropped (extract.ts), but
// that's extract.ts's contract, not handler.ts's own. enforceExtractionBoundary
// (boundary.ts) re-applies both rules explicitly here — sourceQuote-less
// fields dropped, the nine excluded fields never copied — so the handler
// doesn't just inherit correctness as a side effect of how extract.ts happens
// to parse JSON today.
export const handler: Schema['extractFacts']['functionHandler'] = async (event) => {
  const { documentKey } = event.arguments

  // DOCUMENTS_BUCKET_NAME is wired via backend.ts's addEnvironment, not
  // defineFunction's `environment` (the bucket doesn't exist yet when this
  // function is defined), so it isn't in the generated `env` module above.
  const bucketName = process.env.DOCUMENTS_BUCKET_NAME
  if (!bucketName) {
    throw new Error('DOCUMENTS_BUCKET_NAME is not set')
  }

  const object = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: documentKey }))
  if (!object.Body) {
    throw new Error(`Document ${documentKey} has no body`)
  }
  const bytes = await object.Body.transformToByteArray()
  const base64Data = Buffer.from(bytes).toString('base64')
  const mimeType = object.ContentType ?? mimeTypeFromKey(documentKey)

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

  const facts = await extractFactsFromDocument({ mimeType, base64Data }, (args) => ai.models.generateContent(args))
  return enforceExtractionBoundary(facts)
}
