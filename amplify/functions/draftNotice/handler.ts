import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { GoogleGenAI } from '@google/genai'
import { todayInIST } from '@lapse/rules'
import type { CaseFacts, ClockBoard } from '@lapse/rules'
import { env } from '$amplify/env/draft-notice'
import type { Schema } from '../../data/resource'
import { draftSynopsis } from './synopsis'
import { draftNoticeForCase } from './draft'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)
const client = generateClient<Schema>({ authMode: 'iam' })
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

// One Lambda backs two operations — synopsisForCase (M4-T5, model-free) and
// draftNoticeForCase (M4-T1, Gemini-backed) — routed by field name. Both
// share the same {caseId} argument shape and string return type, so one
// handler type covers both; see amplify/data/resource.ts for the schema.
//
// The `Schema[...]['functionHandler']` type models AppSync's *direct* Lambda
// resolver event (`event.info.fieldName`), but Amplify Gen2's function
// directive actually invokes through a JS/VTL pipeline function that sends
// its own flat payload — `fieldName` at the top level, not nested under
// `info` (confirmed against the deployed sandbox's resolver template,
// amplify/artifacts/.../*.vtl: `"fieldName": $util.toJson($ctx.stash.get
// ("fieldName"))` at the payload root). event.fieldName is what the runtime
// actually sends; event.info exists on the type but is undefined at runtime.
type FieldRoutedEvent = { arguments: { caseId: string }; fieldName: string }

export const handler: Schema['synopsisForCase']['functionHandler'] = async (rawEvent) => {
  const event = rawEvent as unknown as FieldRoutedEvent
  const { caseId } = event.arguments

  const { data, errors } = await client.models.Case.get({ id: caseId })
  if (errors) {
    throw new Error(errors[0]?.message ?? `Failed to load case ${caseId}`)
  }
  if (!data) {
    throw new Error(`Case ${caseId} not found`)
  }

  if (event.fieldName === 'draftNoticeForCase') {
    if (!data.facts) {
      throw new Error(`Case ${caseId} has no facts on file`)
    }
    // Deliberately does not use data.result — see draft.ts's CaseRecord
    // comment for why that field is never trusted here. facts/result are both
    // AWSJSON columns stored via JSON.stringify (src/lib/cases.ts) and come
    // back as JSON-encoded strings, not parsed objects (same shape M3-T4 hit
    // on the extractFacts read side).
    const record = {
      facts: JSON.parse(data.facts as unknown as string) as CaseFacts,
      result: data.result,
    }
    return draftNoticeForCase(record, caseId, todayInIST(), (args) => ai.models.generateContent(args))
  }

  if (!data.result) {
    throw new Error(`Case ${caseId} has no computed result yet`)
  }
  const board = JSON.parse(data.result as unknown as string) as ClockBoard
  return draftSynopsis(board.facts, board.clock3).text
}
