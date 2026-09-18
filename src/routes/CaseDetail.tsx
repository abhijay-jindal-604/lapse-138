import { useParams } from 'react-router-dom'
import type { ClockBoard as ClockBoardData } from '@lapse/rules'
import actNow from '../../packages/rules/fixtures/act-now.json'
import deadlineMissed from '../../packages/rules/fixtures/deadline-missed.json'
import needsReview from '../../packages/rules/fixtures/needs-review.json'
import { ClockBoard } from '../components/ClockBoard'

// M1 renders from Lane A's fixture ClockBoards directly — there is no persistence layer
// yet (that's M2-T2), so a case ID is one of these three fixture names for now.
const FIXTURES: Record<string, ClockBoardData> = {
  'act-now': actNow as ClockBoardData,
  'deadline-missed': deadlineMissed as ClockBoardData,
  'needs-review': needsReview as ClockBoardData,
}

export function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const board = caseId ? FIXTURES[caseId] : undefined

  if (!board) {
    return (
      <section>
        <h1>Case not found</h1>
        <p>
          "{caseId}" isn't one of the fixture cases (<code>act-now</code>,{' '}
          <code>deadline-missed</code>, <code>needs-review</code>). Real case persistence lands
          in M2-T2.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h1>Case {board.facts.chequeNumber}</h1>
      <ClockBoard board={board} />
    </section>
  )
}
