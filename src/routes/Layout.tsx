import { NavLink, Outlet } from 'react-router-dom'
import '../styles/layout.css'

// Verbatim from LEGAL_RULES.md §7 — do not paraphrase.
export const DISCLAIMER_TEXT =
  'This is a deadline calculator, not legal advice, and using it does not create a ' +
  'lawyer-client relationship. Dates depend on facts only you can confirm. Have a lawyer ' +
  'verify before you act or file.'

export function Layout() {
  return (
    <>
      <header className="app-header">
        <NavLink to="/" className="app-header__brand">
          Lapse
        </NavLink>
        <nav className="app-header__nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/new">New case</NavLink>
        </nav>
      </header>

      <p className="disclaimer-banner" role="note">
        {DISCLAIMER_TEXT}
      </p>

      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
