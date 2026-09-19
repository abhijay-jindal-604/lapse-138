// The recompute boundary M4-T1 asks for: never trust a client-supplied
// result. `CaseRecord.result` is typed `unknown` and never read below — it
// exists on this type only so a caller (or a test) can hand this function
// exactly what a tampered `Case.result` row would look like and prove it has
// no effect. `Case` carries `allow.publicApiKey()` (amplify/data/resource.ts),
// so any client can call `Case.update({ id, result: <anything> })` directly;
// this function is what makes that harmless for the notice it drafts. Only
// `facts` and the server's own `today` ever feed computeClockBoard.

import { computeClockBoard } from '@lapse/rules'
import type { CaseFacts, ISODate } from '@lapse/rules'
import { draftNoticeText, type GenerateContentFn } from './notice'

export type CaseRecord = {
  facts: CaseFacts
  result: unknown
}

export async function draftNoticeForCase(
  record: CaseRecord,
  caseId: string,
  today: ISODate,
  generateContent: GenerateContentFn,
): Promise<string> {
  const board = computeClockBoard(record.facts, today, caseId)
  return draftNoticeText(board, generateContent)
}
