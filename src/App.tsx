import { Route, Routes } from 'react-router-dom'
import { CaseDetail } from './routes/CaseDetail'
import { Dashboard } from './routes/Dashboard'
import { Layout } from './routes/Layout'
import { NewCase } from './routes/NewCase'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewCase />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
      </Route>
    </Routes>
  )
}

export default App
