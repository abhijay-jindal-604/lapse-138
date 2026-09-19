import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import type { ExtractedFacts } from '../../amplify/functions/extractFacts/types'

const client = generateClient<Schema>()

// M3-T1/T2: the Lambda already enforces the extraction boundary server-side —
// this just calls it and hands back the eight document-extractable fields.
// Same AWSJSON quirk as src/lib/cases.ts: a JSON return type comes back as a
// JSON-encoded string, not a parsed object — confirmed against the live
// response (`{"data":{"extractFacts":"{\"chequeNumber\":...}"}}`).
export async function extractFactsFromDocument(documentKey: string): Promise<ExtractedFacts> {
  const { data, errors } = await client.queries.extractFacts({ documentKey })
  if (errors || data == null) {
    throw new Error(errors?.[0]?.message ?? 'Failed to extract facts from document')
  }
  return JSON.parse(data as unknown as string) as ExtractedFacts
}
