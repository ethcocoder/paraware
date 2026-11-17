import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { LanguageProvider } from './i18n';
import { ToastProvider } from './toast';
import { CitizenLayout, AuthorityLayout } from './components/Layouts';
import { Login, Register } from './pages/AuthPages';
import CitizenHome from './pages/CitizenHome';
import NewReport from './pages/NewReport';
import MyReports from './pages/MyReports';
import CitizenReportDetail from './pages/CitizenReportDetail';
import CitizenAnnouncements from './pages/CitizenAnnouncements';
import Profile from './pages/Profile';
import AuthorityInbox from './pages/AuthorityInbox';
import AuthorityReport from './pages/AuthorityReport';
import AuthorityAnnouncements from './pages/AuthorityAnnouncements';
import AuthorityDepartments from './pages/AuthorityDepartments';
import AuditLog from './pages/AuditLog';
import NotFound from './pages/NotFound';
import { PageLoader } from './components/UI';

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="boot-screen">
        <PageLoader label="Opening Paraware…" />
      </div>
    );
  }
  if (!user) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }
  if (role === 'citizen' && user.role !== 'citizen') {
    return <Navigate to="/authority" replace />;
  }
  if (role === 'authority' && user.role === 'citizen') {
    return <Navigate to="/app" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/app"
          element={
            <RequireRole role="citizen">
              <CitizenLayout />
            </RequireRole>
          }
        >
          <Route index element={<CitizenHome />} />
          <Route path="report" element={<NewReport />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="reports/:id" element={<CitizenReportDetail />} />
          <Route path="announcements" element={<CitizenAnnouncements />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route
          path="/authority"
          element={
            <RequireRole role="authority">
              <AuthorityLayout />
            </RequireRole>
          }
        >
          <Route index element={<AuthorityInbox />} />
          <Route path="queue" element={<AuthorityInbox mine />} />
          <Route path="reports/:id" element={<AuthorityReport />} />
          <Route path="announcements" element={<AuthorityAnnouncements />} />
          <Route path="departments" element={<AuthorityDepartments />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="*" element={<Navigate to="/authority" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
