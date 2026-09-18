import { useState } from 'react'
import type { CaseFacts, ClockBoard as ClockBoardData } from '@lapse/rules'
import { computeClockBoard, todayInIST } from '@lapse/rules'
import { CaseForm } from '../components/CaseForm'
import { ClockBoard } from '../components/ClockBoard'

export function NewCase() {
  const [board, setBoard] = useState<ClockBoardData | null>(null)

  function handleSubmit(facts: CaseFacts) {
    const caseId = crypto.randomUUID()
    setBoard(computeClockBoard(facts, todayInIST(), caseId))
  }

  if (board) {
    return (
      <section>
        <h1>Case {board.facts.chequeNumber}</h1>
        <ClockBoard board={board} />
        <button type="button" className="case-form__submit" onClick={() => setBoard(null)}>
          Start another case
        </button>
      </section>
    )
  }

  return (
    <section>
      <h1>New case</h1>
      <CaseForm onSubmit={handleSubmit} />
    </section>
  )
}
