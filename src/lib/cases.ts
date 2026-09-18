import type { ClockBoard } from '@lapse/rules'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

export async function saveCase(board: ClockBoard): Promise<string> {
  const { data, errors } = await client.models.Case.create({
    id: board.caseId,
    title: `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`,
    status: board.overallStatus,
    // AWSJSON fields must be sent as JSON-encoded strings in GraphQL variables —
    // the client does not stringify them for you (AppSync's AWSJSON scalar only
    // accepts a raw object literal inline in query text, not as a variable).
    facts: JSON.stringify(board.facts),
    result: JSON.stringify(board),
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
  return JSON.parse(data.result as unknown as string) as ClockBoard
}

export type CaseSummary = {
  id: string
  title: string
  board: ClockBoard
}

// M4-T3: the dashboard needs every saved case's full board (to derive the next
// deadline), not just the summary columns — result already carries it, so no
// second round trip per case.
export async function listCases(): Promise<CaseSummary[]> {
  const { data, errors } = await client.models.Case.list()
  if (errors) {
    throw new Error(errors[0]?.message ?? 'Failed to list cases')
  }
  return data
    .filter((c): c is typeof c & { result: string } => c.result != null)
    .map((c) => ({
      id: c.id,
      title: c.title,
      board: JSON.parse(c.result as unknown as string) as ClockBoard,
    }))
}

export async function fetchSynopsis(caseId: string): Promise<string> {
  const { data, errors } = await client.queries.synopsisForCase({ caseId })
  if (errors || data == null) {
    throw new Error(errors?.[0]?.message ?? 'Failed to generate synopsis')
  }
  return data
}
