import type { ClockBoard } from '@lapse/rules'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { normalizeMobile } from './normalizeMobile'

const client = generateClient<Schema>()

export async function saveCase(
  board: ClockBoard,
  documentKey?: string,
  linkedCaseIds?: string[],
): Promise<string> {
  const { data, errors } = await client.models.Case.create({
    id: board.caseId,
    title: `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`,
    status: board.overallStatus,
    // AWSJSON fields must be sent as JSON-encoded strings in GraphQL variables —
    // the client does not stringify them for you (AppSync's AWSJSON scalar only
    // accepts a raw object literal inline in query text, not as a variable).
    facts: JSON.stringify(board.facts),
    // BL-2: linkedCaseIds rides alongside the ClockBoard fields in this JSON
    // blob rather than inside the ClockBoard type itself — computeClockBoard's
    // return value is asserted byte-for-byte against fixtures via toEqual, and
    // it has no business knowing about UI-only party linking anyway.
    result: JSON.stringify({ ...board, linkedCaseIds: linkedCaseIds ?? [] }),
    computedAt: board.computedAt,
    isSample: false,
    documentKey: documentKey ?? null,
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
  isSample: boolean
  linkedCaseIds: string[]
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
    .map((c) => {
      const parsed = JSON.parse(c.result as unknown as string) as ClockBoard & {
        linkedCaseIds?: string[]
      }
      return {
        id: c.id,
        title: c.title,
        board: parsed,
        isSample: c.isSample ?? false,
        linkedCaseIds: parsed.linkedCaseIds ?? [],
      }
    })
}

// BL-2: cases sharing a normalized accusedMobile with the one being created —
// the confirm dialog surfaces these so a human can decide whether to link
// them, rather than silently merging on a recyclable number.
export async function findLinkedCases(
  mobile: string | null,
  excludeCaseId: string,
): Promise<CaseSummary[]> {
  const target = normalizeMobile(mobile)
  if (target === null) return []
  const all = await listCases()
  // Defensive boundary, same as Dashboard.tsx: a persisted case is external
  // data, and a stale/partial row missing facts must not crash matching.
  return all.filter(
    (c) =>
      c.id !== excludeCaseId &&
      c.board?.facts &&
      normalizeMobile(c.board.facts.accusedMobile) === target,
  )
}

export async function fetchSynopsis(caseId: string): Promise<string> {
  const { data, errors } = await client.queries.synopsisForCase({ caseId })
  if (errors || data == null) {
    throw new Error(errors?.[0]?.message ?? 'Failed to generate synopsis')
  }
  return data
}

export async function fetchDraftNotice(caseId: string): Promise<string> {
  const { data, errors } = await client.queries.draftNoticeForCase({ caseId })
  if (errors || data == null) {
    throw new Error(errors?.[0]?.message ?? 'Failed to generate draft notice')
  }
  return data
}
