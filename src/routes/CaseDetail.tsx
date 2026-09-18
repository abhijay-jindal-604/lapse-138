import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ClockBoard as ClockBoardData } from '@lapse/rules'
import actNow from '../../packages/rules/fixtures/act-now.json'
import deadlineMissed from '../../packages/rules/fixtures/deadline-missed.json'
import needsReview from '../../packages/rules/fixtures/needs-review.json'
import { ClockBoard } from '../components/ClockBoard'
import { loadCase } from '../lib/cases'

// The dashboard still links to these three fixture IDs (M1) alongside real, persisted
// cases (M2-T2) — check the fixtures first since they're free, then fall back to Amplify.
const FIXTURES: Record<string, ClockBoardData> = {
  'act-now': actNow as ClockBoardData,
  'deadline-missed': deadlineMissed as ClockBoardData,
  'needs-review': needsReview as ClockBoardData,
}

export function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const fixture = caseId ? FIXTURES[caseId] : undefined
  const [board, setBoard] = useState<ClockBoardData | null | undefined>(fixture)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (fixture || !caseId) {
      return
    }
    setBoard(undefined)
    loadCase(caseId)
      .then(setBoard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load case'))
  }, [caseId, fixture])

  if (board === undefined) {
    return (
      <section>
        <h1>Loading case…</h1>
      </section>
    )
  }

  if (!board) {
    return (
      <section>
        <h1>Case not found</h1>
        {error && <p className="case-form__error">{error}</p>}
        <p>"{caseId}" doesn't match a saved case.</p>
      </section>
    )
  }

  return (
    <section>
      <h1>Case {board.facts.chequeNumber}</h1>
      <ClockBoard board={board} />
      <p className="case-detail__links">
        <Link to={`/case/${caseId}/synopsis`}>View draft synopsis</Link>
      </p>
    </section>
  )
}
