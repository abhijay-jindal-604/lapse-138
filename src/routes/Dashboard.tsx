import { Link } from 'react-router-dom'

// Fixture cases only until M2-T2 lands real persistence — see CaseDetail.tsx.
const FIXTURE_CASES = [
  { id: 'act-now', label: 'Cheque #004521 — Anand Traders', status: 'ACT_NOW' },
  { id: 'deadline-missed', label: 'Cheque #004518 — Anand Traders', status: 'DEADLINE_MISSED' },
  { id: 'needs-review', label: 'Cheque #004530 — Anand Traders', status: 'NEEDS_REVIEW' },
]

export function Dashboard() {
  return (
    <section>
      <h1>Dashboard</h1>
      <p>Fixture cases for now — real cases, sorted by urgency, land in M4-T3.</p>
      <ul>
        {FIXTURE_CASES.map((c) => (
          <li key={c.id}>
            <Link to={`/case/${c.id}`}>{c.label}</Link> — {c.status}
          </li>
        ))}
      </ul>
    </section>
  )
}
