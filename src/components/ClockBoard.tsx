import type {
  Clock1Result,
  Clock2Result,
  Clock3Result,
  Clock4Result,
  ClockBoard as ClockBoardData,
  DateEstimate,
  GateAResult,
  RecoveryPath,
} from '@lapse/rules'
import { ReasoningChain } from './ReasoningChain'
import '../styles/clockboard.css'

// Short, human badge text per clock status — distinct from the raw status
// literal (which is why this isn't just `status.replace(/_/g, ' ')`: e.g.
// Clock2's 'live' should read "Notice pending", not "live").
const CLOCK_STATUS_LABEL: Record<string, string> = {
  PROCEED: 'Cleared',
  PROCEED_WITH_NOTE: 'Cleared — with note',
  NOT_A_138_CASE: 'Not a §138 case',
  NEEDS_REVIEW: 'Needs review',
  ACT_NOW: 'Present now',
  PASS: 'Cleared',
  live: 'Pending',
  DEADLINE_MISSED: 'Deadline missed',
  RESOLVED: 'Resolved',
  not_yet_open: 'Not yet open',
  PREMATURE: 'Premature — needs review',
  BLOCKED: 'Blocked',
}

function ClockHead({ title, status }: { title: string; status: string }) {
  return (
    <div className="clock-card__head">
      <h3>{title}</h3>
      <span className="clock-card__badge">{CLOCK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}</span>
    </div>
  )
}

function BlockedCard({ title, reason }: { title: string; reason: string }) {
  return (
    <section className="clock-card" data-clock-status="BLOCKED">
      <ClockHead title={title} status="BLOCKED" />
      <p className="clock-card__dates">{reason}</p>
    </section>
  )
}

// When Clock 2 or 4 misses its deadline with a re-presentation recovery path,
// packages/rules leaves the downstream clocks uncomputed (there's nothing to
// compute until re-presentation happens) rather than null-and-hidden — the UI
// says so explicitly instead of the card just vanishing.
function representationBlock(board: ClockBoardData): { deadline: string } | null {
  if (board.clock2?.status === 'DEADLINE_MISSED' && board.clock2.recoveryPath.kind === 'RE_PRESENT_CHEQUE') {
    return { deadline: board.clock2.recoveryPath.deadline }
  }
  return null
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
      <ClockHead title="Gate A — is this a §138 case?" status={gateA.status} />
      <ReasoningChain steps={gateA.reasoning} />
    </section>
  )
}

function Clock1Card({ clock }: { clock: Clock1Result }) {
  return (
    <section className="clock-card" data-clock-status={clock.status}>
      <ClockHead title="Clock 1 — Presentation validity" status={clock.status} />
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
      <ClockHead title="Clock 2 — Demand notice" status={clock.status} />
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
      <ClockHead title="Clock 3 — Payment window" status={clock.status} />
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
      <ClockHead title="Clock 4 — Complaint filing" status={clock.status} />
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
  const block = representationBlock(board)
  return (
    <div className="clock-board" data-overall-status={board.overallStatus}>
      {board.provisional && (
        <header className="clock-board__header">
          <span className="provisional-flag">
            Provisional — legally enforceable debt unconfirmed
          </span>
        </header>
      )}

      <p className="clock-board__meta">
        Computed {board.computedAt} against today's date {board.today}
      </p>

      <div className="clock-board__clocks">
        <GateACard gateA={board.gateA} />
        {board.clock1 && <Clock1Card clock={board.clock1} />}
        {board.clock2 && <Clock2Card clock={board.clock2} />}
        {board.clock3 ? (
          <Clock3Card clock={board.clock3} />
        ) : (
          block && (
            <BlockedCard
              title="Clock 3 — Payment window"
              reason={`Depends on whether the cheque is re-presented before ${block.deadline}.`}
            />
          )
        )}
        {board.clock4 ? (
          <Clock4Card clock={board.clock4} />
        ) : (
          block && <BlockedCard title="Clock 4 — Complaint filing" reason="Depends on whether the cheque is re-presented." />
        )}
      </div>
    </div>
  )
}
