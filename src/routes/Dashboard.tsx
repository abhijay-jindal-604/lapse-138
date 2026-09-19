import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ClockBoard, OverallStatus } from '@lapse/rules'
import actNow from '../../packages/rules/fixtures/act-now.json'
import advisoryWindow from '../../packages/rules/fixtures/advisory-window.json'
import deadlineMissed from '../../packages/rules/fixtures/deadline-missed.json'
import needsReview from '../../packages/rules/fixtures/needs-review.json'
import { listCases } from '../lib/cases'
import { getNextDeadline, type NextDeadline } from '../lib/deadlines'
import '../styles/clockboard.css' // reuses .status-badge's overall-status colour map
import '../styles/dashboard.css'

const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  NOT_A_138_CASE: 'Not a §138 case',
  RESOLVED: 'Resolved — no offence',
  NEEDS_REVIEW: 'Needs review',
  DEADLINE_MISSED: 'Deadline missed',
  ACT_NOW: 'Act now',
  ON_TRACK: 'On track',
}

type DashboardEntry = {
  id: string
  title: string
  board: ClockBoard
  isSample: boolean
}

function titleFor(board: ClockBoard): string {
  return `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`
}

// Same three fixtures CaseDetail.tsx resolves by id — kept on the dashboard so
// there's something to click before any case has been saved for real. Not part of
// M4-T4's seeded isSample data, so they don't trigger the sample-data banner.
const FIXTURE_ENTRIES: DashboardEntry[] = [
  { id: 'act-now', title: titleFor(actNow as ClockBoard), board: actNow as ClockBoard, isSample: false },
  {
    id: 'deadline-missed',
    title: titleFor(deadlineMissed as ClockBoard),
    board: deadlineMissed as ClockBoard,
    isSample: false,
  },
  { id: 'needs-review', title: titleFor(needsReview as ClockBoard), board: needsReview as ClockBoard, isSample: false },
  {
    id: 'advisory-window',
    title: titleFor(advisoryWindow as ClockBoard),
    board: advisoryWindow as ClockBoard,
    isSample: false,
  },
]

function formatDayCount(deadline: NextDeadline): string {
  const { daysRemaining, isMissed } = deadline
  if (isMissed) {
    const overdueBy = Math.abs(daysRemaining)
    return overdueBy === 0 ? 'Missed today' : `${overdueBy} day${overdueBy === 1 ? '' : 's'} overdue`
  }
  if (daysRemaining === 0) return 'Due today'
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} day${daysRemaining === -1 ? '' : 's'} overdue`
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
}

export function Dashboard() {
  const [cases, setCases] = useState<DashboardEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCases()
      // The M1 fixtures' dates are hardcoded, not relative to today (unlike seed.ts's
      // sample cases), so they only exist to give the dashboard something to click
      // before any case — real or seeded — has actually been saved. Once real cases
      // exist, mixing in a fixture with a fixed, ever-drifting-more-overdue date would
      // fight M4-T4's "hero case sits at the top" guarantee, so it drops out entirely.
      .then((real) => setCases(real.length > 0 ? real : [...real, ...FIXTURE_ENTRIES]))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load saved cases')
        setCases(FIXTURE_ENTRIES)
      })
  }, [])

  if (!cases) {
    return (
      <section>
        <h1>Dashboard</h1>
        <p>Loading cases…</p>
      </section>
    )
  }

  // Ascending by nextDeadlineDate: soonest (or most overdue) first. Cases with
  // no live deadline (RESOLVED, NOT_A_138_CASE, most NEEDS_REVIEW) have
  // nothing to be urgent about, so they sink to the bottom, alphabetically.
  const rows = cases
    .map((c) => ({ ...c, deadline: getNextDeadline(c.board) }))
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.date < b.deadline.date ? -1 : a.deadline.date > b.deadline.date ? 1 : 0
      if (a.deadline) return -1
      if (b.deadline) return 1
      return a.title.localeCompare(b.title)
    })

  const mostUrgentId = rows[0]?.deadline ? rows[0].id : null
  const hasSampleData = rows.some((c) => c.isSample)

  return (
    <section>
      <h1>Dashboard</h1>
      {error && <p className="case-form__error">{error}</p>}
      {hasSampleData && <p className="dashboard-sample-banner">Sample data. Not real cases.</p>}
      <ol className="dashboard-list">
        {rows.map((c) => {
          const isMostUrgent = c.id === mostUrgentId
          return (
            <li key={c.id} className="dashboard-row" data-most-urgent={isMostUrgent || undefined}>
              {isMostUrgent && <span className="dashboard-row__flag">Most urgent</span>}
              <Link to={`/case/${c.id}`} className="dashboard-row__title">
                {c.title}
              </Link>
              <span className="status-badge dashboard-row__status" data-overall-status={c.board.overallStatus}>
                {OVERALL_STATUS_LABEL[c.board.overallStatus]}
              </span>
              <span
                className="dashboard-row__days"
                data-missed={c.deadline?.isMissed || undefined}
              >
                {c.deadline ? formatDayCount(c.deadline) : '—'}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
