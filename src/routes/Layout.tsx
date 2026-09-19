import { NavLink, Outlet } from 'react-router-dom'
import '../styles/layout.css'

// Verbatim from LEGAL_RULES.md §7 — do not paraphrase.
export const DISCLAIMER_TEXT =
  'This is a deadline calculator, not legal advice, and using it does not create a ' +
  'lawyer-client relationship. Dates depend on facts only you can confirm. Have a lawyer ' +
  'verify before you act or file.'

export function Layout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink to="/" className="app-sidebar__brand">
          <span className="app-sidebar__brand-name">Lapse</span>
          <span className="app-sidebar__brand-tag">§138 deadline calculator</span>
        </NavLink>

        <NavLink to="/new" className="app-sidebar__new">
          + New case
        </NavLink>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
        >
          Dashboard
        </NavLink>

        <p className="app-sidebar__disclaimer" role="note">
          {DISCLAIMER_TEXT}
        </p>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
