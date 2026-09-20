import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseSummary } from '../lib/cases'
import { normalizeMobile } from '../lib/normalizeMobile'
import '../styles/linkConfirm.css'

function maskMobile(mobile: string | null): string {
  const normalized = normalizeMobile(mobile)
  if (!normalized) return '—'
  return `XXXXX ${normalized.slice(-5)}`
}

// BL-2: surfaced when a new case's accusedMobile matches one or more existing
// cases. Confirm links them for display only (Dashboard grouping) — no data
// merge, and declining leaves every case fully independent, as today.
export function LinkConfirmDialog({
  matches,
  onConfirm,
  onDecline,
}: {
  matches: CaseSummary[]
  onConfirm: (selectedCaseIds: string[]) => void
  onDecline: () => void
}) {
  // Pre-checked (opt-out): the common case is a repeat defaulter with another
  // bounced cheque, so linking all matches with the fewest clicks wins.
  const [selected, setSelected] = useState<Set<string>>(new Set(matches.map((m) => m.id)))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="link-confirm" role="dialog" aria-modal="true" aria-labelledby="link-confirm-title">
      <div className="link-confirm__panel">
        <h2 id="link-confirm-title">Same mobile number as an existing case</h2>
        <p className="link-confirm__intro">
          This accused's mobile number matches {matches.length === 1 ? 'a case' : `${matches.length} cases`}{' '}
          already on file. Link them so the dashboard groups them together — this only affects
          display, no case data is merged.
        </p>
        <ul className="link-confirm__list">
          {matches.map((m) => (
            <li key={m.id} className="link-confirm__row">
              <label className="link-confirm__checkbox-label">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                />
                <span className="link-confirm__row-main">
                  <span className="link-confirm__row-name">{m.board.facts.drawerName}</span>
                  <span className="link-confirm__row-meta">
                    Mobile {maskMobile(m.board.facts.accusedMobile)} · Cheque #{m.board.facts.chequeNumber}
                  </span>
                </span>
              </label>
              <Link to={`/case/${m.id}`} target="_blank" rel="noopener noreferrer" className="link-confirm__row-open">
                View case ↗
              </Link>
            </li>
          ))}
        </ul>
        <div className="link-confirm__actions">
          <button type="button" className="btn btn--secondary" onClick={onDecline}>
            Skip linking
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onConfirm([...selected])}
          >
            Link selected
          </button>
        </div>
      </div>
    </div>
  )
}
