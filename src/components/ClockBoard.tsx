import type {
  Clock1Result,
  Clock2Result,
  Clock3Result,
  Clock4Result,
  ClockBoard as ClockBoardData,
  DateEstimate,
  GateAResult,
  OverallStatus,
  RecoveryPath,
} from '@lapse/rules'
import { ReasoningChain } from './ReasoningChain'
import '../styles/clockboard.css'

const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  NOT_A_138_CASE: 'Not a §138 case',
  RESOLVED: 'Resolved — no offence',
  NEEDS_REVIEW: 'Needs review',
  DEADLINE_MISSED: 'Deadline missed',
  ACT_NOW: 'Act now',
  ON_TRACK: 'On track',
}

function formatDateEstimate(estimate: DateEstimate) {
  if (estimate.basis === 'computed') {
    return <span className="date-estimate date-estimate--computed">{estimate.date}</span>
  }
  return (
    <span className="date-estimate date-estimate--advisory">
      {estimate.earliest} – {estimate.latest} <em>(advisory)</em>
    </span>
  )
}

function RecoveryPathCard({ path }: { path: RecoveryPath }) {
  return (
    <div className="recovery-path">
      <p className="recovery-path__label">Recovery path</p>
      {path.kind === 'RE_PRESENT_CHEQUE' && (
        <p className="recovery-path__headline">
          Re-present the cheque before <strong>{path.deadline}</strong>.
        </p>
      )}
      {path.kind === 'CONDONE_DELAY' && (
        <p className="recovery-path__headline">
          An application to condone the delay may be filed — discretionary, not a right.
        </p>
      )}
      {path.kind === 'REFILE_SAME_CAUSE' && (
        <p className="recovery-path__headline">
          Refile on the same cause of action
          {path.timeRemains ? (
            <>
              , before <strong>{path.filingDeadline}</strong>.
            </>
          ) : (
            <> — but that window has already closed.</>
          )}
        </p>
      )}
      {path.kind === 'CIVIL_SUIT_ONLY' && (
        <p className="recovery-path__headline">
          No §138 route remains on this cheque. A civil suit on the underlying debt is the
          remaining option.
        </p>
      )}
      <p className="recovery-path__plain">{path.plainEnglish}</p>
      <p className="recovery-path__source">{path.source}</p>
    </div>
  )
}

function GateACard({ gateA }: { gateA: GateAResult }) {
  return (
    <section className="clock-card" data-clock-status={gateA.status}>
      <h3>Gate A — is this a §138 case?</h3>
      <p className="clock-card__status">{gateA.status.replace(/_/g, ' ')}</p>
      <ReasoningChain steps={gateA.reasoning} />
    </section>
  )
}

function Clock1Card({ clock }: { clock: Clock1Result }) {
  return (
    <section className="clock-card" data-clock-status={clock.status}>
      <h3>Clock 1 — Presentation validity</h3>
      <p className="clock-card__status">{clock.status.replace(/_/g, ' ')}</p>
      <p className="clock-card__dates">
        Valid until <strong>{clock.lastValidPresentationDate}</strong> (3-month RBI validity —
        the statute's own 6-month figure, {clock.statutorySixMonthDate}, does not govern since
        01 Apr 2012)
      </p>
      <ReasoningChain steps={clock.reasoning} />
    </section>
  )
}

function Clock2Card({ clock }: { clock: Clock2Result }) {
  return (
    <section className="clock-card" data-clock-status={clock.status}>
      <h3>Clock 2 — Demand notice</h3>
      <p className="clock-card__status">{clock.status.replace(/_/g, ' ')}</p>
      {clock.status === 'live' && (
        <p className="clock-card__dates">
          Send the notice by <strong>{clock.noticeDeadline}</strong> — {clock.daysRemaining} days
          left
        </p>
      )}
      {(clock.status === 'PASS' || clock.status === 'DEADLINE_MISSED') && (
        <p className="clock-card__dates">
          Deadline was <strong>{clock.noticeDeadline}</strong>
        </p>
      )}
      {clock.status !== 'NEEDS_REVIEW' && clock.assumption && (
        <p className="clock-card__assumption">{clock.assumption}</p>
      )}
      {clock.status === 'DEADLINE_MISSED' && <RecoveryPathCard path={clock.recoveryPath} />}
      <ReasoningChain steps={clock.reasoning} />
    </section>
  )
}

function Clock3Card({ clock }: { clock: Clock3Result }) {
  return (
    <section className="clock-card" data-clock-status={clock.status}>
      <h3>Clock 3 — Payment window</h3>
      <p className="clock-card__status">{clock.status.replace(/_/g, ' ')}</p>
      {clock.status === 'NEEDS_REVIEW' && 'reviewReason' in clock && (
        <p className="clock-card__dates">
          {clock.reviewReason === 'part_payment' && 'Part payment recorded — needs review.'}
          {clock.reviewReason === 'missing_trigger' &&
            'No receipt date known yet — nothing computed.'}
          {clock.reviewReason === 'pending_service_confirmation' && (
            <>
              Payment window ends {formatDateEstimate(clock.paymentWindowEnds)}, cause of action{' '}
              {formatDateEstimate(clock.causeOfActionDate)}, earliest safe filing{' '}
              {formatDateEstimate(clock.earliestSafeFilingDate)}
            </>
          )}
        </p>
      )}
      {clock.status === 'RESOLVED' && (
        <p className="clock-card__dates">
          Paid within the window ending {formatDateEstimate(clock.paymentWindowEnds)}. No
          offence.
        </p>
      )}
      {clock.status === 'live' && (
        <p className="clock-card__dates">
          Window ends {formatDateEstimate(clock.paymentWindowEnds)} — {clock.daysRemaining} days
          left. You cannot file yet.
          {clock.deemedService && ' (deemed service)'}
        </p>
      )}
      {clock.status === 'PASS' && (
        <p className="clock-card__dates">
          Window ended {formatDateEstimate(clock.paymentWindowEnds)}; cause of action{' '}
          {formatDateEstimate(clock.causeOfActionDate)}
          {clock.deemedService && ' (deemed service)'}
        </p>
      )}
      <ReasoningChain steps={clock.reasoning} />
    </section>
  )
}

function Clock4Card({ clock }: { clock: Clock4Result }) {
  return (
    <section className="clock-card" data-clock-status={clock.status}>
      <h3>Clock 4 — Complaint filing</h3>
      <p className="clock-card__status">{clock.status.replace(/_/g, ' ')}</p>
      <p className="clock-card__dates">
        Window {clock.filingWindowOpens} – <strong>{clock.filingDeadline}</strong>
        {clock.status === 'not_yet_open' && ` — opens in ${clock.opensInDays} days`}
        {clock.status === 'live' && ` — ${clock.daysRemaining} days left`}
      </p>
      {(clock.status === 'PREMATURE' || clock.status === 'DEADLINE_MISSED') && (
        <RecoveryPathCard path={clock.recoveryPath} />
      )}
      <ReasoningChain steps={clock.reasoning} />
    </section>
  )
}

export function ClockBoard({ board }: { board: ClockBoardData }) {
  return (
    <div className="clock-board" data-overall-status={board.overallStatus}>
      <header className="clock-board__header">
        <span className="status-badge" data-overall-status={board.overallStatus}>
          {OVERALL_STATUS_LABEL[board.overallStatus]}
        </span>
        {board.provisional && (
          <span className="provisional-flag">
            Provisional — legally enforceable debt unconfirmed
          </span>
        )}
      </header>

      <p className="clock-board__meta">
        Computed {board.computedAt} against today's date {board.today}
      </p>

      <div className="clock-board__clocks">
        <GateACard gateA={board.gateA} />
        {board.clock1 && <Clock1Card clock={board.clock1} />}
        {board.clock2 && <Clock2Card clock={board.clock2} />}
        {board.clock3 && <Clock3Card clock={board.clock3} />}
        {board.clock4 && <Clock4Card clock={board.clock4} />}
      </div>
    </div>
  )
}
