import { useState } from 'react'
import type { CaseFacts, ClockBoard } from '@lapse/rules'
import { computeClockBoard, todayInIST } from '@lapse/rules'
import type { CaseSummary } from '../lib/cases'
import { findLinkedCases, saveCase } from '../lib/cases'

type Step = 'form' | 'confirming' | 'saving'

// BL-2: the identical build-board → save → navigate shape NewCase.tsx and
// Confirm.tsx each had, now shared, with a confirm interstitial spliced in
// between "board computed" and "case saved" when the accused's mobile number
// matches an existing case.
export function useLinkConfirmFlow(documentKey?: string) {
  const [step, setStep] = useState<Step>('form')
  const [matches, setMatches] = useState<CaseSummary[]>([])
  const [pendingBoard, setPendingBoard] = useState<ClockBoard | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Returns the new case's id when it saves immediately (no matches — the
  // caller navigates straight there); returns undefined when it instead
  // enters 'confirming' and is waiting on confirmLink/declineLink.
  async function handleSubmit(facts: CaseFacts): Promise<string | undefined> {
    const caseId = crypto.randomUUID()
    const board = computeClockBoard(facts, todayInIST(), caseId)
    setSaveError(null)
    try {
      const found = await findLinkedCases(facts.accusedMobile, caseId)
      if (found.length === 0) {
        setStep('saving')
        return await saveCase(board, documentKey)
      }
      setMatches(found)
      setPendingBoard(board)
      setStep('confirming')
      return undefined
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save case')
      setStep('form')
      throw err
    }
  }

  async function finishSave(linkedCaseIds: string[]): Promise<string> {
    if (!pendingBoard) throw new Error('No pending case to save')
    setStep('saving')
    setSaveError(null)
    try {
      return await saveCase(pendingBoard, documentKey, linkedCaseIds)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save case')
      setStep('form')
      throw err
    }
  }

  return {
    step,
    matches,
    saveError,
    handleSubmit,
    confirmLink: (selectedCaseIds: string[]) => finishSave(selectedCaseIds),
    declineLink: () => finishSave([]),
  }
}
