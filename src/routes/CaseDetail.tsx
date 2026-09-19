import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ClockBoard as ClockBoardData, OverallStatus } from '@lapse/rules'
import actNow from '../../packages/rules/fixtures/act-now.json'
import advisoryWindow from '../../packages/rules/fixtures/advisory-window.json'
import deadlineMissed from '../../packages/rules/fixtures/deadline-missed.json'
import needsReview from '../../packages/rules/fixtures/needs-review.json'
import { ClockBoard } from '../components/ClockBoard'
import { DateTravel } from '../components/DateTravel'
import { loadCase } from '../lib/cases'
import { formatDate, formatRupees } from '../lib/format'
import { downloadICS, getReminderEvents } from '../lib/ics'
import '../styles/clockboard.css'

const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  NOT_A_138_CASE: 'Not a §138 case',
  RESOLVED: 'Resolved',
  NEEDS_REVIEW: 'Needs review',
  DEADLINE_MISSED: 'Deadline missed',
  ACT_NOW: 'Act now',
  ON_TRACK: 'On track',
}

// The dashboard still links to these three fixture IDs (M1) alongside real, persisted
// cases (M2-T2) — check the fixtures first since they're free, then fall back to Amplify.
const FIXTURES: Record<string, ClockBoardData> = {
  'act-now': actNow as ClockBoardData,
  'deadline-missed': deadlineMissed as ClockBoardData,
  'needs-review': needsReview as ClockBoardData,
  'advisory-window': advisoryWindow as ClockBoardData,
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

  const { facts } = board

  return (
    <section>
      <p className="case-detail__breadcrumb">
        <Link to="/">← Dashboard</Link>
      </p>
      <p className="case-detail__eyebrow">
        {facts.drawerName} / Cheque #{facts.chequeNumber}
      </p>
      <div className="case-detail__title">
        <h1>
          {facts.drawerName} — #{facts.chequeNumber}
        </h1>
        <span className="status-badge" data-overall-status={board.overallStatus}>
          {OVERALL_STATUS_LABEL[board.overallStatus]}
        </span>
      </div>
      <p className="case-detail__meta">
        {formatRupees(facts.amountInPaise)} · dated {formatDate(facts.chequeDate)} · drawn on{' '}
        {facts.drawerBankName}, {facts.drawerBankBranch} · payee {facts.payeeName}
      </p>
      <p className="case-detail__disclaimer">
        Calculator only, not legal advice — a lawyer should verify these dates before you act or file.
      </p>

      {fixture ? <ClockBoard board={board} /> : <DateTravel board={board} />}
      <p className="case-detail__links">
        <Link to={`/case/${caseId}/notice`}>View draft notice</Link>
        {' · '}
        <Link to={`/case/${caseId}/synopsis`}>View draft synopsis</Link>
      </p>
      {getReminderEvents(board).length > 0 && (
        <button type="button" className="case-form__submit" onClick={() => downloadICS(board)}>
          Download reminders (.ics)
        </button>
      )}
    </section>
  )
}
