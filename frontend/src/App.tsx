import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { Landing } from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import './styles/landing.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-editor-bg">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <PrivateRoute>
              <Editor />
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:projectId/file/:fileId"
          element={
            <PrivateRoute>
              <Editor />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Landing />} />
      </Routes>
    </div>
  )
}

export default App
