import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { CaseFacts } from '@lapse/rules'
import type { ExtractedFacts } from '../../amplify/functions/extractFacts/types'
import { CaseForm, EMPTY_DRAFT, type Draft, type FieldMeta } from '../components/CaseForm'
import { LinkConfirmDialog } from '../components/LinkConfirmDialog'
import { useLinkConfirmFlow } from '../hooks/useLinkConfirmFlow'
import { extractFactsFromDocument } from '../lib/extraction'

type Status =
  | { kind: 'extracting' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; initialDraft: Draft; fieldMeta: FieldMeta }

// Only the eight fields a document can supply (LEGAL_RULES.md §2) ever get an
// entry here — ExtractedFacts has no keys for the six human-only or three
// affidavit-boundary fields, so they can't leak into a pre-filled draft.
function draftFromExtraction(facts: ExtractedFacts): { draft: Draft; fieldMeta: FieldMeta } {
  const draft: Draft = { ...EMPTY_DRAFT }
  const fieldMeta: FieldMeta = {}

  if (facts.chequeNumber) {
    draft.chequeNumber = facts.chequeNumber.value
    fieldMeta.chequeNumber = facts.chequeNumber
  }
  if (facts.chequeDate) {
    draft.chequeDate = facts.chequeDate.value
    fieldMeta.chequeDate = facts.chequeDate
  }
  if (facts.amountInPaise) {
    draft.amountInRupees = String(facts.amountInPaise.value / 100)
    fieldMeta.amountInRupees = facts.amountInPaise
  }
  if (facts.drawerBankName) {
    draft.drawerBankName = facts.drawerBankName.value
    fieldMeta.drawerBankName = facts.drawerBankName
  }
  if (facts.drawerBankBranch) {
    draft.drawerBankBranch = facts.drawerBankBranch.value
    fieldMeta.drawerBankBranch = facts.drawerBankBranch
  }
  if (facts.presentationDate) {
    draft.presentationDate = facts.presentationDate.value
    fieldMeta.presentationDate = facts.presentationDate
  }
  if (facts.dishonourMemoDate) {
    draft.dishonourMemoDate = facts.dishonourMemoDate.value
    fieldMeta.dishonourMemoDate = facts.dishonourMemoDate
  }
  if (facts.dishonourReason) {
    draft.dishonourReason = facts.dishonourReason.value
    fieldMeta.dishonourReason = facts.dishonourReason
  }

  return { draft, fieldMeta }
}

// M3-T4: the confirm-and-edit flow that M3-T3's Upload/UploadDocument route
// hands off to. Every extracted field is still just a CaseForm field — editable,
// required where CaseForm already requires it — with provenance (hover source
// quote, low-confidence flag) layered on top. The six human-only questions and
// the affidavit-boundary group come from CaseForm unchanged, since nothing here
// ever extracts them (M3-T2 strips them server-side regardless).
export function Confirm() {
  const location = useLocation()
  const documentKey = (location.state as { documentKey?: string } | null)?.documentKey
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ kind: 'extracting' })
  const flow = useLinkConfirmFlow(documentKey)

  useEffect(() => {
    if (!documentKey) return
    let cancelled = false
    extractFactsFromDocument(documentKey)
      .then((facts) => {
        if (cancelled) return
        const { draft, fieldMeta } = draftFromExtraction(facts)
        setStatus({ kind: 'ready', initialDraft: draft, fieldMeta })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to extract facts from document',
        })
      })
    return () => {
      cancelled = true
    }
  }, [documentKey])

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

  if (!documentKey) {
    return (
      <section>
        <h1>Confirm extracted details</h1>
        <div className="route-switch">
          <p>No document to confirm.</p>
          <div className="route-switch__actions">
            <Link to="/new/upload" className="btn btn--secondary">
              Upload one
            </Link>
            <Link to="/new" className="btn btn--secondary">
              Enter manually
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1>Confirm extracted details</h1>
      <p>
        Check every field below — a highlighted field was read from your document; hover it to
        see the exact source text. Fields flagged <strong>low confidence</strong> are worth a
        second look. The document couldn't supply everything: the fields under "Only you can
        answer these" are never extracted and must be answered by hand.
      </p>

      {status.kind === 'extracting' && <p role="status">Reading the document…</p>}

      {status.kind === 'error' && (
        <>
          <p className="case-form__error" role="alert">
            {status.message}
          </p>
          <div className="route-switch">
            <p>You can still enter this case's details by hand.</p>
            <div className="route-switch__actions">
              <Link to="/new" className="btn btn--secondary">
                Enter manually
              </Link>
            </div>
          </div>
        </>
      )}

      {status.kind === 'ready' && (
        <>
          {flow.saveError && <p className="case-form__error">{flow.saveError}</p>}
          {flow.step === 'form' && (
            <CaseForm
              onSubmit={handleSubmit}
              initialDraft={status.initialDraft}
              fieldMeta={status.fieldMeta}
            />
          )}
          {flow.step === 'confirming' && (
            <LinkConfirmDialog matches={flow.matches} onConfirm={handleConfirm} onDecline={handleDecline} />
          )}
          {flow.step === 'saving' && <p role="status">Saving case…</p>}
        </>
      )}
    </section>
  )
}
