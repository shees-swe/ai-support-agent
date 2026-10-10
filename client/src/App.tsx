import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api';
import { Login, Register } from './pages/Auth';
import { DashboardLayout, Overview } from './pages/Dashboard';
import Knowledge from './pages/Knowledge';
import Conversations from './pages/Conversations';
import WidgetSettings from './pages/WidgetSettings';
import WidgetPage from './pages/WidgetPage';
import Landing from './pages/Landing';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="widget" element={<WidgetSettings />} />
      </Route>
      <Route path="/widget/:businessId" element={<WidgetPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
