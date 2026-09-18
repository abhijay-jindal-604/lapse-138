import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CaseFacts } from '@lapse/rules'
import { computeClockBoard, todayInIST } from '@lapse/rules'
import { CaseForm } from '../components/CaseForm'
import { saveCase } from '../lib/cases'

export function NewCase() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(facts: CaseFacts) {
    const caseId = crypto.randomUUID()
    const board = computeClockBoard(facts, todayInIST(), caseId)
    setError(null)
    try {
      const savedId = await saveCase(board)
      navigate(`/case/${savedId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save case')
    }
  }

  return (
    <section>
      <h1>New case</h1>
      {error && <p className="case-form__error">{error}</p>}
      <CaseForm onSubmit={handleSubmit} />
    </section>
  )
}
