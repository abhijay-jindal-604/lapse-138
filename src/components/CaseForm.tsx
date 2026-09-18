import { useState } from 'react'
import type {
  CaseFacts,
  DishonourReason,
  ISODate,
  LegallyEnforceableDebt,
  NoticeServiceMode,
  PaymentStatus,
} from '@lapse/rules'
import { toIntegerPaise } from '@lapse/rules'
import '../styles/form.css'

// Verbatim from LEGAL_RULES.md §7 — do not paraphrase.
const AFFIDAVIT_WARNING =
  'These particulars must be filed under an affidavit that they pertain to the accused. ' +
  'Verify them personally — the app does not check, infer, or generate this affidavit, and ' +
  'a false affidavit of service can expose you to court action.'

const DISHONOUR_REASONS: { value: DishonourReason; label: string }[] = [
  { value: 'insufficient_funds', label: 'Insufficient funds' },
  { value: 'exceeds_arrangement', label: 'Exceeds arrangement' },
  { value: 'account_closed', label: 'Account closed' },
  { value: 'stop_payment', label: 'Stop payment' },
  { value: 'signature_mismatch', label: 'Signature mismatch' },
  { value: 'material_alteration', label: 'Material alteration' },
  { value: 'frozen_account', label: 'Frozen account' },
  { value: 'refer_to_drawer', label: 'Refer to drawer' },
  { value: 'other', label: 'Other' },
]

type Draft = {
  payeeName: string
  payeeAddress: string
  drawerName: string
  drawerAddress: string
  chequeNumber: string
  chequeDate: string
  amountInRupees: string
  drawerBankName: string
  drawerBankBranch: string
  payeeBankBranch: string
  presentationDate: string
  dishonourMemoDate: string
  dishonourReason: DishonourReason | ''
  noticeSentDate: string
  paymentDate: string
  complaintFiledDate: string
  interestClaimedInRupees: string

  // human-only, §2
  bankInfoReceivedDate: string
  noticeReceivedDate: string
  noticeServiceMode: NoticeServiceMode | ''
  legallyEnforceableDebt: LegallyEnforceableDebt | ''
  paymentStatus: PaymentStatus | ''
  presentationCount: '' | '1' | '2' | '3'

  // affidavit-boundary, §2/§7 — must never be pre-filled
  accusedEmail: string
  accusedMobile: string
  accusedMessagingDetails: string
}

const EMPTY_DRAFT: Draft = {
  payeeName: '',
  payeeAddress: '',
  drawerName: '',
  drawerAddress: '',
  chequeNumber: '',
  chequeDate: '',
  amountInRupees: '',
  drawerBankName: '',
  drawerBankBranch: '',
  payeeBankBranch: '',
  presentationDate: '',
  dishonourMemoDate: '',
  dishonourReason: '',
  noticeSentDate: '',
  paymentDate: '',
  complaintFiledDate: '',
  interestClaimedInRupees: '',
  bankInfoReceivedDate: '',
  noticeReceivedDate: '',
  noticeServiceMode: '',
  legallyEnforceableDebt: '',
  paymentStatus: '',
  presentationCount: '',
  accusedEmail: '',
  accusedMobile: '',
  accusedMessagingDetails: '',
}

function toISODateOrNull(value: string): ISODate | null {
  return value === '' ? null : (value as ISODate)
}

function toPaiseOrNull(rupees: string) {
  if (rupees === '') return null
  return toIntegerPaise(Math.round(Number(rupees) * 100))
}

function draftToCaseFacts(draft: Draft): CaseFacts {
  return {
    payeeName: draft.payeeName,
    payeeAddress: draft.payeeAddress,
    drawerName: draft.drawerName,
    drawerAddress: draft.drawerAddress,
    chequeNumber: draft.chequeNumber,
    chequeDate: draft.chequeDate as ISODate,
    amountInPaise: toIntegerPaise(Math.round(Number(draft.amountInRupees) * 100)),
    drawerBankName: draft.drawerBankName,
    drawerBankBranch: draft.drawerBankBranch,
    payeeBankBranch: draft.payeeBankBranch,
    presentationDate: toISODateOrNull(draft.presentationDate),
    dishonourMemoDate: toISODateOrNull(draft.dishonourMemoDate),
    bankInfoReceivedDate: toISODateOrNull(draft.bankInfoReceivedDate),
    dishonourReason: draft.dishonourReason as DishonourReason,
    presentationCount: Number(draft.presentationCount) as 1 | 2 | 3,
    noticeSentDate: toISODateOrNull(draft.noticeSentDate),
    noticeReceivedDate: toISODateOrNull(draft.noticeReceivedDate),
    noticeServiceMode: draft.noticeServiceMode as NoticeServiceMode,
    paymentStatus: draft.paymentStatus as PaymentStatus,
    paymentDate: toISODateOrNull(draft.paymentDate),
    complaintFiledDate: toISODateOrNull(draft.complaintFiledDate),
    legallyEnforceableDebt: draft.legallyEnforceableDebt as LegallyEnforceableDebt,
    interestClaimedInPaise: toPaiseOrNull(draft.interestClaimedInRupees),
    accusedEmail: draft.accusedEmail === '' ? null : draft.accusedEmail,
    accusedMobile: draft.accusedMobile === '' ? null : draft.accusedMobile,
    accusedMessagingDetails:
      draft.accusedMessagingDetails === '' ? null : draft.accusedMessagingDetails,
  }
}

export function CaseForm({ onSubmit }: { onSubmit?: (facts: CaseFacts) => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [captured, setCaptured] = useState<CaseFacts | null>(null)

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const facts = draftToCaseFacts(draft)
    if (onSubmit) {
      onSubmit(facts)
    } else {
      setCaptured(facts)
    }
  }

  return (
    <form className="case-form" onSubmit={handleSubmit}>
      {/* Group A — fields a document can supply, plus other ordinary facts. §2 */}
      <fieldset className="form-group form-group--general">
        <h2>Case details</h2>

        <h3>Parties</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="payeeName">Payee name</label>
            <input
              id="payeeName"
              required
              value={draft.payeeName}
              onChange={(e) => set('payeeName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="drawerName">Drawer name</label>
            <input
              id="drawerName"
              required
              value={draft.drawerName}
              onChange={(e) => set('drawerName', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="payeeAddress">Payee address</label>
            <textarea
              id="payeeAddress"
              required
              value={draft.payeeAddress}
              onChange={(e) => set('payeeAddress', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="drawerAddress">Drawer address</label>
            <textarea
              id="drawerAddress"
              required
              value={draft.drawerAddress}
              onChange={(e) => set('drawerAddress', e.target.value)}
            />
          </div>
        </div>

        <h3>The cheque</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="chequeNumber">Cheque number</label>
            <input
              id="chequeNumber"
              required
              value={draft.chequeNumber}
              onChange={(e) => set('chequeNumber', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="chequeDate">Cheque date</label>
            <input
              id="chequeDate"
              type="date"
              required
              value={draft.chequeDate}
              onChange={(e) => set('chequeDate', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="amountInRupees">Amount (₹)</label>
            <input
              id="amountInRupees"
              type="number"
              min="0"
              step="0.01"
              required
              value={draft.amountInRupees}
              onChange={(e) => set('amountInRupees', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="drawerBankName">Drawer's bank</label>
            <input
              id="drawerBankName"
              required
              value={draft.drawerBankName}
              onChange={(e) => set('drawerBankName', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="drawerBankBranch">Drawer's bank branch</label>
            <input
              id="drawerBankBranch"
              required
              value={draft.drawerBankBranch}
              onChange={(e) => set('drawerBankBranch', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="payeeBankBranch">
              Payee's bank branch <span className="form-field__hint">(drives jurisdiction)</span>
            </label>
            <input
              id="payeeBankBranch"
              required
              value={draft.payeeBankBranch}
              onChange={(e) => set('payeeBankBranch', e.target.value)}
            />
          </div>
        </div>

        <h3>Presentation &amp; dishonour</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="presentationDate">
              Presentation date <span className="form-field__hint">(leave blank if not yet presented)</span>
            </label>
            <input
              id="presentationDate"
              type="date"
              value={draft.presentationDate}
              onChange={(e) => set('presentationDate', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="dishonourMemoDate">Dishonour memo date</label>
            <input
              id="dishonourMemoDate"
              type="date"
              value={draft.dishonourMemoDate}
              onChange={(e) => set('dishonourMemoDate', e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="dishonourReason">Dishonour reason</label>
          <select
            id="dishonourReason"
            required
            value={draft.dishonourReason}
            onChange={(e) => set('dishonourReason', e.target.value as DishonourReason)}
          >
            <option value="" disabled>
              Select a reason
            </option>
            {DISHONOUR_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <h3>Notice &amp; outcome</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="noticeSentDate">Notice dispatch date</label>
            <input
              id="noticeSentDate"
              type="date"
              value={draft.noticeSentDate}
              onChange={(e) => set('noticeSentDate', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="paymentDate">Payment date (if any)</label>
            <input
              id="paymentDate"
              type="date"
              value={draft.paymentDate}
              onChange={(e) => set('paymentDate', e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="complaintFiledDate">Complaint filed date (if already filed)</label>
          <input
            id="complaintFiledDate"
            type="date"
            value={draft.complaintFiledDate}
            onChange={(e) => set('complaintFiledDate', e.target.value)}
          />
        </div>

        <h3>Relief sought</h3>
        <div className="form-field">
          <label htmlFor="interestClaimedInRupees">Interest claimed (₹, optional)</label>
          <input
            id="interestClaimedInRupees"
            type="number"
            min="0"
            step="0.01"
            value={draft.interestClaimedInRupees}
            onChange={(e) => set('interestClaimedInRupees', e.target.value)}
          />
        </div>
      </fieldset>

      {/* Group B — the six fields a document can almost never supply. §2 */}
      <fieldset className="form-group form-group--human-only">
        <h2>Only you can answer these</h2>
        <p className="form-group__intro">
          A document can't reliably supply these — get them right, this is where claims
          actually die.
        </p>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="bankInfoReceivedDate">
              When did you actually learn of the dishonour from the bank?
              <span className="form-field__hint"> (not the memo date — triggers the 30-day notice clock)</span>
            </label>
            <input
              id="bankInfoReceivedDate"
              type="date"
              value={draft.bankInfoReceivedDate}
              onChange={(e) => set('bankInfoReceivedDate', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="noticeReceivedDate">Notice received date</label>
            <input
              id="noticeReceivedDate"
              type="date"
              value={draft.noticeReceivedDate}
              onChange={(e) => set('noticeReceivedDate', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="noticeServiceMode">Notice service mode</label>
            <select
              id="noticeServiceMode"
              required
              value={draft.noticeServiceMode}
              onChange={(e) => set('noticeServiceMode', e.target.value as NoticeServiceMode)}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="received">Received</option>
              <option value="refused">Refused</option>
              <option value="unclaimed">Unclaimed</option>
              <option value="unknown">Unknown / no tracking result yet</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="presentationCount">Presentation count</label>
            <select
              id="presentationCount"
              required
              value={draft.presentationCount}
              onChange={(e) => set('presentationCount', e.target.value as Draft['presentationCount'])}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="1">1st presentation</option>
              <option value="2">2nd presentation (re-presented)</option>
              <option value="3">3rd presentation</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="legallyEnforceableDebt">Is this a legally enforceable debt?</label>
            <select
              id="legallyEnforceableDebt"
              required
              value={draft.legallyEnforceableDebt}
              onChange={(e) =>
                set('legallyEnforceableDebt', e.target.value as LegallyEnforceableDebt)
              }
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="paymentStatus">Payment status</label>
            <select
              id="paymentStatus"
              required
              value={draft.paymentStatus}
              onChange={(e) => set('paymentStatus', e.target.value as PaymentStatus)}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="none">Nothing paid</option>
              <option value="part">Part paid</option>
              <option value="full">Paid in full</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Group C — affidavit-boundary fields. §2/§7. Never pre-filled. */}
      <fieldset className="form-group form-group--affidavit">
        <h2>Accused's contact particulars</h2>
        <p className="form-warning">{AFFIDAVIT_WARNING}</p>

        <div className="form-field">
          <label htmlFor="accusedEmail">Accused's email</label>
          <input
            id="accusedEmail"
            type="email"
            autoComplete="off"
            value={draft.accusedEmail}
            onChange={(e) => set('accusedEmail', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="accusedMobile">Accused's mobile</label>
          <input
            id="accusedMobile"
            type="tel"
            autoComplete="off"
            value={draft.accusedMobile}
            onChange={(e) => set('accusedMobile', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="accusedMessagingDetails">
            Accused's messaging identifier <span className="form-field__hint">(WhatsApp, etc.)</span>
          </label>
          <input
            id="accusedMessagingDetails"
            autoComplete="off"
            value={draft.accusedMessagingDetails}
            onChange={(e) => set('accusedMessagingDetails', e.target.value)}
          />
        </div>
      </fieldset>

      <button type="submit" className="case-form__submit">
        Save case facts
      </button>

      {captured && (
        <div className="case-form__preview">
          <p>
            Facts captured locally — not yet saved or sent to the engine. Wiring this form to{' '}
            <code>computeClocks</code> and persistence lands in M2-T1/M2-T2.
          </p>
          <pre>{JSON.stringify(captured, null, 2)}</pre>
        </div>
      )}
    </form>
  )
}
