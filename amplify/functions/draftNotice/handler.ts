import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { ClockBoard } from '@lapse/rules'
import { env } from '$amplify/env/draft-notice'
import type { Schema } from '../../data/resource'
import { draftSynopsis } from './synopsis'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)
const client = generateClient<Schema>({ authMode: 'iam' })

// M4-T5 only: the synopsis path. The notice-drafting path (M4-T1, Bedrock) is
// still blocked (DECISIONS.md D-04) and not wired into this handler yet — when
// it is, it must stay in its own branch so this synopsis path never grows a
// Bedrock dependency by accident.
export const handler: Schema['synopsisForCase']['functionHandler'] = async (event) => {
  const { caseId } = event.arguments

  const { data, errors } = await client.models.Case.get({ id: caseId })
  if (errors) {
    throw new Error(errors[0]?.message ?? `Failed to load case ${caseId}`)
  }
  if (!data?.result) {
    throw new Error(`Case ${caseId} not found`)
  }

  const board = JSON.parse(data.result as unknown as string) as ClockBoard
  return draftSynopsis(board.facts, board.clock3).text
}
