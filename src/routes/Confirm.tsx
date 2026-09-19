import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { CaseFacts } from '@lapse/rules'
import { computeClockBoard, todayInIST } from '@lapse/rules'
import type { ExtractedFacts } from '../../amplify/functions/extractFacts/types'
import { CaseForm, EMPTY_DRAFT, type Draft, type FieldMeta } from '../components/CaseForm'
import { saveCase } from '../lib/cases'
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
  const [saveError, setSaveError] = useState<string | null>(null)

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
    const caseId = crypto.randomUUID()
    const board = computeClockBoard(facts, todayInIST(), caseId)
    setSaveError(null)
    try {
      const savedId = await saveCase(board, documentKey)
      navigate(`/case/${savedId}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save case')
    }
  }

  if (!documentKey) {
    return (
      <section>
        <h1>Confirm extracted details</h1>
        <p>
          No document to confirm. <Link to="/new/upload">Upload one</Link> or{' '}
          <Link to="/new">enter details manually</Link> instead.
        </p>
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
          <p>
            You can still <Link to="/new">enter this case's details manually</Link>.
          </p>
        </>
      )}

      {status.kind === 'ready' && (
        <>
          {saveError && <p className="case-form__error">{saveError}</p>}
          <CaseForm
            onSubmit={handleSubmit}
            initialDraft={status.initialDraft}
            fieldMeta={status.fieldMeta}
          />
        </>
      )}
    </section>
  )
}
