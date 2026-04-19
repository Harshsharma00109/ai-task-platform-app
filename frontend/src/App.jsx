import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DashboardLayout from './components/dashboard/DashboardLayout';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute><RegisterPage /></PublicRoute>
      } />

      <Route path="/" element={
        <ProtectedRoute><DashboardLayout /></ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
