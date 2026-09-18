import { useParams } from 'react-router-dom'

export function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()

  return (
    <section>
      <h1>Case {caseId}</h1>
      <p>The clock board will go here.</p>
    </section>
  )
}
