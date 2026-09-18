import { Link } from 'react-router-dom'
import { Upload } from '../components/Upload'

// Placeholder host page for the Upload component (M3-T3). Extraction and the
// confirm-and-edit flow (M3-T4) aren't built yet, so a successful upload has
// nowhere to go but here — this route is replaced once Confirm.tsx exists.
export function UploadDocument() {
  return (
    <section>
      <h1>Upload a document</h1>
      <p>
        Upload a dishonour memo or cheque image. Extraction isn't wired up yet —
        for now this only stores the file. <Link to="/new">Enter details manually</Link>{' '}
        instead.
      </p>
      <Upload />
    </section>
  )
}
