import type { CaseFacts } from '@lapse/rules'
import { Link, useNavigate } from 'react-router-dom'
import { CaseForm } from '../components/CaseForm'
import { LinkConfirmDialog } from '../components/LinkConfirmDialog'
import { useLinkConfirmFlow } from '../hooks/useLinkConfirmFlow'

export function NewCase() {
  const navigate = useNavigate()
  const flow = useLinkConfirmFlow()

  async function handleSubmit(facts: CaseFacts) {
    const savedId = await flow.handleSubmit(facts)
    if (savedId) navigate(`/case/${savedId}`)
  }

  async function handleConfirm(selectedCaseIds: string[]) {
    const savedId = await flow.confirmLink(selectedCaseIds)
    navigate(`/case/${savedId}`)
  }

  async function handleDecline() {
    const savedId = await flow.declineLink()
    navigate(`/case/${savedId}`)
  }

  return (
    <section>
      <h1>New case</h1>
      <div className="route-switch route-switch--feature">
        <p>Have a dishonour memo or cheque image? We can read the particulars off it.</p>
        <div className="route-switch__actions">
          <Link to="/new/upload" className="btn btn--primary">
            Upload document
          </Link>
        </div>
      </div>
      {flow.saveError && <p className="case-form__error">{flow.saveError}</p>}
      {flow.step === 'form' && <CaseForm onSubmit={handleSubmit} />}
      {flow.step === 'confirming' && (
        <LinkConfirmDialog matches={flow.matches} onConfirm={handleConfirm} onDecline={handleDecline} />
      )}
      {flow.step === 'saving' && <p role="status">Saving case…</p>}
    </section>
  )
}
