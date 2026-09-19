import { Link, useNavigate } from 'react-router-dom'
import { Upload } from '../components/Upload'

// Hosts the Upload component (M3-T3). A successful upload hands the S3 key
// straight to Confirm.tsx (M3-T4), which runs extraction and lets the user
// review before saving.
export function UploadDocument() {
  const navigate = useNavigate()

  function handleUploaded(key: string) {
    navigate('/new/confirm', { state: { documentKey: key } })
  }

  return (
    <section>
      <h1>Upload a document</h1>
      <p>Upload a dishonour memo or cheque image and we'll try to read the cheque particulars off it.</p>
      <div className="route-switch">
        <p>Prefer to type the details in yourself?</p>
        <div className="route-switch__actions">
          <Link to="/new" className="btn btn--secondary">
            Enter manually instead
          </Link>
        </div>
      </div>
      <Upload onUploaded={handleUploaded} />
    </section>
  )
}
