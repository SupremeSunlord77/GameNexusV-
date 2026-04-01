import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/login';       
import Register from './pages/auth/Register';
import BehavioralAssessment from './pages/auth/Behavioralassessment';

// The Security Guard
import ProtectedRoute from './components/ProtectedRoute';

// The 3 Dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import ModeratorDashboard from './pages/moderator/ModeratorDashboard';
import UserDashboard from './pages/user/UserDashboard';
import Compatibility from './pages/user/Compatibility';

// 🆕 NEW: Assessment Requirement Wrapper
const RequireAssessment = ({ children }: { children: React.ReactNode }) => {
  const assessmentCompleted = localStorage.getItem('assessmentCompleted');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  // Not logged in? Go to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admin and Moderators skip assessment (they don't need it)
  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    return <>{children}</>;
  }

  // Regular users must complete assessment
  if (assessmentCompleted === 'false' || !assessmentCompleted) {
    return <Navigate to="/assessment" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* --- 🧬 BEHAVIORAL ASSESSMENT (Required after registration) --- */}
        <Route path="/assessment" element={<BehavioralAssessment />} />

        {/* --- 🛡️ ADMIN ONLY (God Mode) --- */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* --- ⚖️ MODERATOR AREA (Toxic Chat Review) --- */}
        <Route 
          path="/moderator" 
          element={
            <ProtectedRoute allowedRoles={['MODERATOR', 'ADMIN']}>
              <ModeratorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* --- 🎮 REGULAR USER (Standard Dashboard - REQUIRES ASSESSMENT) --- */}
        <Route 
          path="/dashboard" 
          element={
            <RequireAssessment>
              <ProtectedRoute allowedRoles={['USER', 'ADMIN', 'MODERATOR']}>
                <UserDashboard />
              </ProtectedRoute>
            </RequireAssessment>
          } 
        />

        {/* --- 🤝 COMPATIBILITY CALCULATOR (Requires Assessment) --- */}
        <Route
          path="/compatibility"
          element={
            <RequireAssessment>
              <ProtectedRoute allowedRoles={['USER', 'ADMIN', 'MODERATOR']}>
                <Compatibility />
              </ProtectedRoute>
            </RequireAssessment>
          }
        />

        {/* Catch-all: Send lost users to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;