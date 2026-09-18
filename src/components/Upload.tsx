import { useRef, useState } from 'react'
import { uploadData } from 'aws-amplify/storage'
import '../styles/upload.css'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — a 6 MB file must be rejected (M3-T3)
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg']
const ACCEPTED_LABEL = 'PDF or JPEG'

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading'; fileName: string; percent: number }
  | { kind: 'error'; message: string }
  | { kind: 'success'; fileName: string; key: string }

function readableSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validate(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a ${ACCEPTED_LABEL} file. Choose a PDF or JPEG.`
  }
  if (file.size > MAX_BYTES) {
    return `"${file.name}" is ${readableSize(file.size)}, over the 5 MB limit. Choose a smaller file.`
  }
  return null
}

export function Upload({
  onUploaded,
}: {
  onUploaded?: (key: string, file: File) => void
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const problem = validate(file)
    if (problem) {
      setStatus({ kind: 'error', message: problem })
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setStatus({ kind: 'uploading', fileName: file.name, percent: 0 })
    const key = `documents/${crypto.randomUUID()}-${file.name}`

    try {
      const task = uploadData({
        path: key,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            const percent = totalBytes
              ? Math.round((transferredBytes / totalBytes) * 100)
              : 0
            setStatus({ kind: 'uploading', fileName: file.name, percent })
          },
        },
      })
      const result = await task.result
      setStatus({ kind: 'success', fileName: file.name, key: result.path })
      onUploaded?.(result.path, file)
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof Error
            ? `Upload failed: ${err.message}`
            : 'Upload failed. Check your connection and try again.',
      })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const busy = status.kind === 'uploading'

  return (
    <div className="upload">
      <div
        className="upload__dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <p className="upload__hint">
          Drag a {ACCEPTED_LABEL} here, or
          <button
            type="button"
            className="upload__browse"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            browse
          </button>
        </p>
        <p className="upload__limit">Up to 5 MB — {ACCEPTED_LABEL} only</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
          onChange={handleInputChange}
          disabled={busy}
          aria-label="Upload document"
        />
      </div>

      {status.kind === 'uploading' && (
        <p className="upload__status upload__status--busy" role="status">
          Uploading {status.fileName}… {status.percent}%
        </p>
      )}
      {status.kind === 'error' && (
        <p className="upload__status upload__status--error" role="alert">
          {status.message}
        </p>
      )}
      {status.kind === 'success' && (
        <p className="upload__status upload__status--success" role="status">
          {status.fileName} uploaded.
        </p>
      )}
    </div>
  )
}
