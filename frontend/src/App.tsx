import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { AnalyzeResume } from './pages/AnalyzeResume';
import { Optimizer } from './pages/Optimizer';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { MockInterview } from './pages/MockInterview';

import { ProfilePlaceholder } from './pages/ProfilePlaceholder';
import { SettingsPlaceholder } from './pages/SettingsPlaceholder';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <AnalyzeResume />
              </ProtectedRoute>
            }
          />
          <Route
            path="/optimizer"
            element={
              <ProtectedRoute>
                <Optimizer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <MockInterview />
              </ProtectedRoute>
            }
          />


          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AnalysisHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPlaceholder />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
