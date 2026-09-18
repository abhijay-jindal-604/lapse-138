import type { ReasoningStep } from '@lapse/rules'

export function ReasoningChain({ steps }: { steps: ReasoningStep[] }) {
  if (steps.length === 0) return null

  return (
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
  )
}
