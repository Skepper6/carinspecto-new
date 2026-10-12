import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PORTALS } from './lib/constants';
import PortalLayout from './components/layout/PortalLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Legal from './pages/Legal';

const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const NewBooking = lazy(() => import('./pages/customer/NewBooking'));
const MyBookings = lazy(() => import('./pages/customer/MyBookings'));
const MyReports = lazy(() => import('./pages/customer/MyReports'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const CustomerSupport = lazy(() => import('./pages/customer/Support'));

const InspectorDashboard = lazy(() => import('./pages/inspector/Dashboard'));
const Assignments = lazy(() => import('./pages/inspector/Assignments'));
const InspectionForm = lazy(() => import('./pages/inspector/InspectionForm'));
const InspectorHistory = lazy(() => import('./pages/inspector/History'));
const InspectorProfile = lazy(() => import('./pages/inspector/Profile'));

const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminInspectors = lazy(() => import('./pages/admin/Inspectors'));
const AdminTickets = lazy(() => import('./pages/admin/Tickets'));
const AdminRevenue = lazy(() => import('./pages/admin/Revenue'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

function Guard({ role, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?role=${role}`} state={{ from: loc.pathname + loc.search }} replace />;
  if (user.role !== role) return <Navigate to={PORTALS[user.role].home} replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div className="boot"><i className="spinner" /></div>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/terms" element={<Legal kind="terms" />} />
      <Route path="/privacy" element={<Legal kind="privacy" />} />

      <Route path="/app" element={<Guard role="customer"><PortalLayout role="customer" /></Guard>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="book" element={<NewBooking />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="reports" element={<MyReports />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      <Route path="/inspector" element={<Guard role="inspector"><PortalLayout role="inspector" /></Guard>}>
        <Route index element={<InspectorDashboard />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="inspect/:id" element={<InspectionForm />} />
        <Route path="history" element={<InspectorHistory />} />
        <Route path="profile" element={<InspectorProfile />} />
      </Route>

      <Route path="/admin" element={<Guard role="admin"><PortalLayout role="admin" /></Guard>}>
        <Route index element={<AdminOverview />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="inspectors" element={<AdminInspectors />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      {/* friendly aliases */}
      <Route path="/user/*" element={<Navigate to="/app" replace />} />
      <Route path="/customer/*" element={<Navigate to="/app" replace />} />
      <Route path="/inspect" element={<Navigate to="/inspector" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
