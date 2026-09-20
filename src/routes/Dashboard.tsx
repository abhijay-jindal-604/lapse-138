import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ClockBoard, OverallStatus } from '@lapse/rules'
import actNow from '../../packages/rules/fixtures/act-now.json'
import advisoryWindow from '../../packages/rules/fixtures/advisory-window.json'
import deadlineMissed from '../../packages/rules/fixtures/deadline-missed.json'
import needsReview from '../../packages/rules/fixtures/needs-review.json'
import { listCases } from '../lib/cases'
import { deadlineActionLabel, getNextDeadline, getRecoveryHeadline, type NextDeadline } from '../lib/deadlines'
import { formatDate, formatRupees, rupeesInWords } from '../lib/format'
import '../styles/clockboard.css' // reuses .status-badge's overall-status colour map
import '../styles/dashboard.css'

const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  NOT_A_138_CASE: 'Not a §138 case',
  RESOLVED: 'Resolved',
  NEEDS_REVIEW: 'Needs review',
  DEADLINE_MISSED: 'Deadline missed',
  ACT_NOW: 'Act now',
  ON_TRACK: 'On track',
}

// RESOLVED has its own Archive tab (BL-1, TASKS.md) rather than sitting alongside
// the active statuses here — a resolved case has nothing left to act on, so mixing
// it into the active filter row would bury the statuses that do.
const FILTERS: { value: OverallStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACT_NOW', label: 'Act now' },
  { value: 'DEADLINE_MISSED', label: 'Deadline missed' },
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'ON_TRACK', label: 'On track' },
  { value: 'NOT_A_138_CASE', label: 'Not a §138 case' },
]

type DashboardEntry = {
  id: string
  title: string
  board: ClockBoard
  isSample: boolean
  linkedCaseIds: string[]
}

function titleFor(board: ClockBoard): string {
  return `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`
}

// Same three fixtures CaseDetail.tsx resolves by id — kept on the dashboard so
// there's something to click before any case has been saved for real. Not part of
// M4-T4's seeded isSample data, so they don't trigger the sample-data banner.
const FIXTURE_ENTRIES: DashboardEntry[] = [
  { id: 'act-now', title: titleFor(actNow as ClockBoard), board: actNow as ClockBoard, isSample: false, linkedCaseIds: [] },
  {
    id: 'deadline-missed',
    title: titleFor(deadlineMissed as ClockBoard),
    board: deadlineMissed as ClockBoard,
    isSample: false,
    linkedCaseIds: [],
  },
  {
    id: 'needs-review',
    title: titleFor(needsReview as ClockBoard),
    board: needsReview as ClockBoard,
    isSample: false,
    linkedCaseIds: [],
  },
  {
    id: 'advisory-window',
    title: titleFor(advisoryWindow as ClockBoard),
    board: advisoryWindow as ClockBoard,
    isSample: false,
    linkedCaseIds: [],
  },
]

function formatDayCount(deadline: NextDeadline): string {
  const { daysRemaining, isMissed, action } = deadline
  if (isMissed) {
    const overdueBy = Math.abs(daysRemaining)
    return overdueBy === 0 ? 'Missed today' : `${overdueBy} day${overdueBy === 1 ? '' : 's'} overdue`
  }
  const label = deadlineActionLabel(action)
  if (daysRemaining === 0) return `Due today ${label}`
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} day${daysRemaining === -1 ? '' : 's'} overdue`
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left ${label}`
}

export function Dashboard() {
  const [cases, setCases] = useState<DashboardEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OverallStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'active' | 'archive'>('active')

  useEffect(() => {
    listCases()
      // The M1 fixtures' dates are hardcoded, not relative to today (unlike seed.ts's
      // sample cases), so they only exist to give the dashboard something to click
      // before any case — real or seeded — has actually been saved. Once real cases
      // exist, mixing in a fixture with a fixed, ever-drifting-more-overdue date would
      // fight M4-T4's "hero case sits at the top" guarantee, so it drops out entirely.
      .then((real) => {
        // Defensive boundary: a persisted case is external data, not something
        // this render can trust the shape of sight-unseen — a stale/partial
        // row missing facts must not crash the whole dashboard.
        const valid = real.filter((c) => c.board?.facts)
        setCases(valid.length > 0 ? valid : [...valid, ...FIXTURE_ENTRIES])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load saved cases')
        setCases(FIXTURE_ENTRIES)
      })
  }, [])

  const rows = useMemo(() => {
    if (!cases) return []
    // Ascending by nextDeadlineDate: soonest (or most overdue) first. Cases with
    // no live deadline (RESOLVED, NOT_A_138_CASE, most NEEDS_REVIEW) have
    // nothing to be urgent about, so they sink to the bottom, alphabetically.
    return cases
      .map((c) => ({ ...c, deadline: getNextDeadline(c.board) }))
      .sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.date < b.deadline.date ? -1 : a.deadline.date > b.deadline.date ? 1 : 0
        if (a.deadline) return -1
        if (b.deadline) return 1
        return a.title.localeCompare(b.title)
      })
  }, [cases])

  if (!cases) {
    return (
      <section>
        <h1>Dashboard</h1>
        <p>Loading cases…</p>
      </section>
    )
  }

  const mostUrgent = rows[0]?.deadline ? rows[0] : null
  const hasSampleData = rows.some((c) => c.isSample)

  const query = search.trim().toLowerCase()
  const filteredRows = rows.filter((c) => {
    const isResolved = c.board.overallStatus === 'RESOLVED'
    if (view === 'archive') {
      if (!isResolved) return false
    } else {
      if (isResolved) return false
      if (statusFilter !== 'ALL' && c.board.overallStatus !== statusFilter) return false
    }
    if (query === '') return true
    return (
      c.board.facts.chequeNumber.toLowerCase().includes(query) ||
      c.board.facts.drawerName.toLowerCase().includes(query)
    )
  })

  // Grouped by drawer (party), preserving each group's first-appearance order
  // in the deadline-sorted list above — a party with a missed cheque still
  // surfaces near the top even though its other cheques may be on track.
  const groups: { drawerName: string; entries: typeof filteredRows }[] = []
  for (const row of filteredRows) {
    const group = groups.find((g) => g.drawerName === row.board.facts.drawerName)
    if (group) group.entries.push(row)
    else groups.push({ drawerName: row.board.facts.drawerName, entries: [row] })
  }

  // BL-2: union-find merge on top of the drawerName partition above — a case
  // with linkedCaseIds (set only once a human confirmed the link) pulls its
  // own group and each linked case's group together, so a repeat defaulter
  // recorded under a slightly different spelling still surfaces as one
  // dashboard entry.
  const caseIdToGroupIndex = new Map<string, number>()
  groups.forEach((g, i) => {
    for (const row of g.entries) caseIdToGroupIndex.set(row.id, i)
  })
  const parent = groups.map((_, i) => i)
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }
  for (const row of filteredRows) {
    if (row.linkedCaseIds.length === 0) continue
    const ownGroupIndex = caseIdToGroupIndex.get(row.id)
    if (ownGroupIndex === undefined) continue
    for (const linkedId of row.linkedCaseIds) {
      const linkedGroupIndex = caseIdToGroupIndex.get(linkedId)
      if (linkedGroupIndex !== undefined) union(ownGroupIndex, linkedGroupIndex)
    }
  }

  // Merged group's header uses the oldest case's drawerName (by computedAt),
  // plus a count of how many other distinct names are linked in — not every
  // distinct name joined, and not separate groups with a cross-reference.
  const mergedByRoot = new Map<
    number,
    { drawerName: string; oldestComputedAt: string; entries: typeof filteredRows; names: Set<string> }
  >()
  groups.forEach((g, i) => {
    const root = find(i)
    const oldestInGroup = g.entries.reduce((oldest, e) =>
      e.board.computedAt < oldest.board.computedAt ? e : oldest,
    )
    const existing = mergedByRoot.get(root)
    if (!existing) {
      mergedByRoot.set(root, {
        drawerName: oldestInGroup.board.facts.drawerName,
        oldestComputedAt: oldestInGroup.board.computedAt,
        entries: [...g.entries],
        names: new Set([g.drawerName]),
      })
    } else {
      existing.entries.push(...g.entries)
      existing.names.add(g.drawerName)
      if (oldestInGroup.board.computedAt < existing.oldestComputedAt) {
        existing.drawerName = oldestInGroup.board.facts.drawerName
        existing.oldestComputedAt = oldestInGroup.board.computedAt
      }
    }
  })
  const mergedGroups = [...mergedByRoot.values()]

  return (
    <section>
      <div className="dashboard-heading">
        <h1>Dashboard</h1>
        <div className="dashboard-search-wrap">
          <span className="dashboard-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="dashboard-search"
            placeholder="Search by cheque number or party name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="case-form__error">{error}</p>}
      {hasSampleData && <p className="dashboard-sample-banner">Sample data. Not real cases.</p>}

      <div className="dashboard-view-tabs">
        <button
          type="button"
          className="dashboard-filter"
          aria-pressed={view === 'active'}
          onClick={() => setView('active')}
        >
          Active
        </button>
        <button
          type="button"
          className="dashboard-filter"
          aria-pressed={view === 'archive'}
          onClick={() => setView('archive')}
        >
          Archive
        </button>
      </div>

      {view === 'active' && (
        <div className="dashboard-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="dashboard-filter"
              aria-pressed={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {view === 'active' && mostUrgent && mostUrgent.deadline && (
        <Link
          to={`/case/${mostUrgent.id}`}
          className="dashboard-hero"
          data-status={mostUrgent.board.overallStatus}
        >
          <div className="dashboard-hero__tags">
            <span className="dashboard-hero__flag">Most urgent</span>
            <span className="status-badge" data-overall-status={mostUrgent.board.overallStatus}>
              {OVERALL_STATUS_LABEL[mostUrgent.board.overallStatus]}
            </span>
          </div>
          <p className="dashboard-hero__title">
            {mostUrgent.board.facts.drawerName} — Cheque #{mostUrgent.board.facts.chequeNumber} ·{' '}
            {formatRupees(mostUrgent.board.facts.amountInPaise)}
          </p>
          <p className="dashboard-hero__action">
            {getRecoveryHeadline(mostUrgent.board) ?? `${formatDayCount(mostUrgent.deadline)}.`}
          </p>
        </Link>
      )}

      <div className="dashboard-groups">
        {mergedGroups.map((group) => {
          const total = group.entries.reduce((sum, e) => sum + e.board.facts.amountInPaise, 0)
          const linkedNameCount = group.names.size - 1
          return (
            <div key={group.entries[0].id} className="dashboard-group">
              <div className="dashboard-group__header">
                <span className="dashboard-group__name">{group.drawerName}</span>
                {linkedNameCount > 0 && (
                  <span className="dashboard-group__linked-badge">
                    {linkedNameCount} linked name{linkedNameCount === 1 ? '' : 's'}
                  </span>
                )}
                <span className="dashboard-group__meta">
                  {group.entries.length} cheque{group.entries.length === 1 ? '' : 's'} ·{' '}
                  {formatRupees(total)} total
                </span>
              </div>
              <div className="dashboard-group__rows">
                {group.entries.map((c) => (
                  <Link
                    key={c.id}
                    to={`/case/${c.id}`}
                    className="dashboard-chip"
                    data-status={c.board.overallStatus}
                  >
                    <div className="dashboard-chip__frame">
                      <div className="dashboard-chip__topline">
                        <span className="dashboard-chip__no">No. {c.board.facts.chequeNumber}</span>
                        <span className="dashboard-chip__dateline">
                          <span className="dashboard-chip__dateline-label">Date</span>
                          <span className="dashboard-chip__dateline-value">{formatDate(c.board.facts.chequeDate)}</span>
                        </span>
                      </div>
                      <div className="dashboard-chip__payline">
                        <div className="dashboard-chip__payline-text">
                          <span className="dashboard-chip__payline-label">Pay to the order of</span>
                          <span className="dashboard-chip__payline-name">{c.board.facts.payeeName}</span>
                        </div>
                        <span className="dashboard-chip__amount-box">{formatRupees(c.board.facts.amountInPaise)}</span>
                      </div>
                      <div className="dashboard-chip__words">
                        <span className="dashboard-chip__words-text">
                          Rupees {rupeesInWords(c.board.facts.amountInPaise)}
                        </span>
                        <span className="dashboard-chip__words-fill" aria-hidden="true" />
                        <span className="dashboard-chip__words-only">Only</span>
                      </div>
                      <div className="dashboard-chip__endorsement">
                        <span className="status-badge dashboard-chip__status" data-overall-status={c.board.overallStatus}>
                          {OVERALL_STATUS_LABEL[c.board.overallStatus]}
                        </span>
                        <span className="dashboard-chip__days" data-missed={c.deadline?.isMissed || undefined}>
                          {c.deadline ? formatDayCount(c.deadline) : OVERALL_STATUS_LABEL[c.board.overallStatus]}
                        </span>
                      </div>
                    </div>
                    <div className="dashboard-chip__micr">
                      <span>⑆{c.board.facts.chequeNumber}⑆</span>
                      <span>⑆{c.board.facts.drawerName.replace(/\s+/g, '').slice(0, 12).toUpperCase()}⑆</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
        {mergedGroups.length === 0 && (
          <p>{view === 'archive' ? 'No resolved cases yet.' : 'No cases match this filter.'}</p>
        )}
      </div>
    </section>
  )
}
