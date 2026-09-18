import type { ClockBoard } from '@lapse/rules'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

export async function saveCase(board: ClockBoard): Promise<string> {
  const { data, errors } = await client.models.Case.create({
    id: board.caseId,
    title: `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`,
    status: board.overallStatus,
    facts: board.facts,
    result: board,
    computedAt: board.computedAt,
    isSample: false,
  })
  if (errors || !data) {
    throw new Error(errors?.[0]?.message ?? 'Failed to save case')
  }
  return data.id
}

export async function loadCase(caseId: string): Promise<ClockBoard | null> {
  const { data, errors } = await client.models.Case.get({ id: caseId })
  if (errors) {
    throw new Error(errors[0]?.message ?? 'Failed to load case')
  }
  if (!data?.result) {
    return null
  }
  return data.result as ClockBoard
}
