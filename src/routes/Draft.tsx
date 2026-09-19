import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDraftNotice } from '../lib/cases'
import '../styles/synopsis.css'

export function Draft() {
  const { caseId } = useParams<{ caseId: string }>()
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!caseId) return
    setText(null)
    setError(null)
    fetchDraftNotice(caseId)
      .then(setText)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to generate draft notice'))
  }, [caseId])

  function handleDownload() {
    if (text == null) return
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `notice-${caseId}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="synopsis">
      <h1>Draft notice</h1>
      <p>
        <Link to={`/case/${caseId}`}>&larr; Back to case</Link>
      </p>

      {error && <p className="case-form__error">{error}</p>}

      {text == null && !error && <p>Generating draft notice…</p>}

      {text != null && (
        <>
          <textarea
            className="synopsis__editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={24}
          />
          <button type="button" className="case-form__submit" onClick={handleDownload}>
            Download as .txt
          </button>
        </>
      )}
    </section>
  )
}
