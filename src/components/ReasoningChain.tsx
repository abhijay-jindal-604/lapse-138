import { useEffect, useRef } from 'react'
import type { ReasoningStep } from '@lapse/rules'

export function ReasoningChain({ steps }: { steps: ReasoningStep[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // A closed <details> hides its content in a way no display/visibility
  // override on the content itself can undo — force it open for the
  // printed page, then restore whatever the reader had it set to.
  useEffect(() => {
    let wasOpen = false
    function beforePrint() {
      const el = detailsRef.current
      if (!el) return
      wasOpen = el.open
      el.open = true
    }
    function afterPrint() {
      const el = detailsRef.current
      if (el) el.open = wasOpen
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])

  if (steps.length === 0) return null

  return (
    <details className="reasoning-chain-details" ref={detailsRef}>
      <summary className="reasoning-chain-summary">
        Reasoning ({steps.length} step{steps.length === 1 ? '' : 's'})
      </summary>
      <ol className="reasoning-chain">
        {steps.map((step, i) => (
          <li key={i} className="reasoning-step">
            <p className="reasoning-step__rule">{step.rule}</p>
            <dl className="reasoning-step__meta">
              <div>
                <dt>Source</dt>
                <dd>{step.source}</dd>
              </div>
              <div>
                <dt>Trigger date</dt>
                <dd>{step.triggerDate ?? '—'}</dd>
              </div>
              <div>
                <dt>Counting rule</dt>
                <dd>{step.countingRule}</dd>
              </div>
              <div>
                <dt>Result date</dt>
                <dd>{step.resultDate ?? '—'}</dd>
              </div>
            </dl>
            <p className="reasoning-step__plain">{step.plainEnglish}</p>
          </li>
        ))}
      </ol>
    </details>
  )
}
