// M5-T4 (DECISIONS.md D-21): the designated wow moment. Drags "today" across a range
// and re-renders the existing ClockBoard against computeClockBoard(facts, draggedToday,
// caseId) — the same published, already-tested engine function every other screen uses.
// No new gate/clock sequencing lives here; this is a slider wrapped around it.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  compare,
  computeClockBoard,
  diffDays,
  type CaseFacts,
  type ClockBoard as ClockBoardData,
  type ISODate,
} from '@lapse/rules'
import { ClockBoard } from './ClockBoard'
import '../styles/datetravel.css'

// Every ISODate this case's facts could ever produce a deadline from — pulled from a
// computed board rather than re-deriving any date arithmetic here (§6: this file owns no
// gate/clock logic).
function datesIn(board: ClockBoardData): ISODate[] {
  const dates: (ISODate | null)[] = [
    board.facts.chequeDate,
    board.facts.presentationDate,
    board.facts.dishonourMemoDate,
    board.facts.bankInfoReceivedDate,
    board.facts.noticeSentDate,
    board.facts.noticeReceivedDate,
    board.facts.paymentDate,
    board.facts.complaintFiledDate,
    board.clock1?.lastValidPresentationDate ?? null,
    board.clock2 && 'noticeDeadline' in board.clock2 ? board.clock2.noticeDeadline : null,
    board.clock3 && 'paymentWindowEnds' in board.clock3 && board.clock3.paymentWindowEnds.basis === 'computed'
      ? board.clock3.paymentWindowEnds.date
      : null,
    board.clock3 && 'causeOfActionDate' in board.clock3 && board.clock3.causeOfActionDate.basis === 'computed'
      ? board.clock3.causeOfActionDate.date
      : null,
    board.clock4?.filingDeadline ?? null,
  ]
  return dates.filter((d): d is ISODate => d !== null)
}

// The slider's range has to cover every deadline this case's facts could ever produce —
// not just the ones visible at the real "today" (a case sitting on a live notice window
// never reaches clock3/clock4 there, but still has a filing deadline further out).
// Recomputing once against a today far past every possible trigger date forces the whole
// chain to resolve (clock2 PASS -> clock3 PASS -> clock4), so those dates are collected
// too — the min/max below is a min/max over facts.* plus that one worst-case board.
function computeRange(facts: CaseFacts, caseId: string): { min: ISODate; max: ISODate } {
  const farFuture = addMonths(facts.chequeDate, 60)
  const worstCase = computeClockBoard(facts, farFuture, caseId)
  const allDates = datesIn(worstCase)

  let min = allDates[0]
  let max = allDates[0]
  for (const d of allDates) {
    if (compare(d, min) < 0) min = d
    if (compare(d, max) > 0) max = d
  }

  // "From before the dishonour date through well past the filing deadline" (TASKS.md
  // M5-T4) — pad both ends so the crossing itself sits comfortably inside the range.
  return { min: addDays(min, -14), max: addDays(max, 30) }
}

export function DateTravel({ board }: { board: ClockBoardData }) {
  const { facts, caseId } = board
  const { min, max } = useMemo(() => computeRange(facts, caseId), [facts, caseId])
  const totalDays = diffDays(min, max)
  const initialOffset = Math.min(Math.max(diffDays(min, board.today), 0), totalDays)

  const [offset, setOffset] = useState(initialOffset)
  const travelDate = addDays(min, offset)
  const traveledBoard = useMemo(
    () => computeClockBoard(facts, travelDate, caseId),
    [facts, caseId, travelDate],
  )

  // Re-triggers the flash animation on every recompute without remounting ClockBoard
  // (which would lose scroll position and collapse open reasoning panels): strip the
  // class, force a reflow, then reapply it so the CSS animation restarts from frame 0.
  const boardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    el.classList.remove('date-travel__board--flash')
    void el.offsetWidth
    el.classList.add('date-travel__board--flash')
  }, [traveledBoard])

  return (
    <div className="date-travel">
      <div className="date-travel__controls">
        <label htmlFor="date-travel-slider" className="date-travel__question">
          What if today were <strong>{travelDate}</strong>?
        </label>
        <input
          id="date-travel-slider"
          type="range"
          className="date-travel__slider"
          min={0}
          max={totalDays}
          step={1}
          value={offset}
          onChange={(event) => setOffset(Number(event.target.value))}
        />
        <div className="date-travel__range-labels">
          <span>{min}</span>
          <span>{max}</span>
        </div>
        <button
          type="button"
          className="date-travel__reset"
          onClick={() => setOffset(initialOffset)}
          disabled={offset === initialOffset}
        >
          Reset to today ({board.today})
        </button>
      </div>
      <div ref={boardRef} className="date-travel__board">
        <ClockBoard board={traveledBoard} />
      </div>
    </div>
  )
}
