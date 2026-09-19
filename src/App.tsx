import { Route, Routes } from 'react-router-dom'
import { CaseDetail } from './routes/CaseDetail'
import { Confirm } from './routes/Confirm'
import { Dashboard } from './routes/Dashboard'
import { Draft } from './routes/Draft'
import { Layout } from './routes/Layout'
import { NewCase } from './routes/NewCase'
import { Synopsis } from './routes/Synopsis'
import { UploadDocument } from './routes/UploadDocument'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewCase />} />
        <Route path="/new/upload" element={<UploadDocument />} />
        <Route path="/new/confirm" element={<Confirm />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/case/:caseId/synopsis" element={<Synopsis />} />
        <Route path="/case/:caseId/notice" element={<Draft />} />
      </Route>
    </Routes>
  )
}

export default App
