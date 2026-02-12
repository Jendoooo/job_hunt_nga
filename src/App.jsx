import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import TechnicalTest from './pages/TechnicalTest'
import AptitudeTest from './pages/AptitudeTest'
import SavillePractice from './pages/SavillePractice'
import AIGeneratedTest from './pages/AIGeneratedTest'
import NLNGTest from './pages/NLNGTest'
import NLNGInteractiveTest from './pages/NLNGInteractiveTest'
import NLNGSJQTest from './pages/NLNGSJQTest'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/test/technical" element={<ProtectedRoute><TechnicalTest /></ProtectedRoute>} />
      <Route path="/test/aptitude" element={<ProtectedRoute><AptitudeTest /></ProtectedRoute>} />
      <Route path="/test/saville-practice" element={<ProtectedRoute><SavillePractice /></ProtectedRoute>} />
      <Route path="/test/nlng" element={<ProtectedRoute><NLNGTest /></ProtectedRoute>} />
      <Route path="/test/nlng-interactive" element={<ProtectedRoute><NLNGInteractiveTest /></ProtectedRoute>} />
      <Route path="/test/nlng-sjq" element={<ProtectedRoute><NLNGSJQTest /></ProtectedRoute>} />
      <Route path="/test/ai-generated" element={<ProtectedRoute><AIGeneratedTest /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
