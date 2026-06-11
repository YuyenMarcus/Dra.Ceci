import { useState } from "react";
import { Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Splash from "./components/Splash.jsx";
import AppLanding from "./pages/AppLanding.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import UpdatePassword from "./pages/UpdatePassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Clients from "./pages/Clients.jsx";
import Appointments from "./pages/Appointments.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import ManageBooking from "./pages/ManageBooking.jsx";
import Settings from "./pages/Settings.jsx";
import ProfileEdit from "./pages/ProfileEdit.jsx";
import PatientHome from "./pages/PatientHome.jsx";
import PatientLogin from "./pages/PatientLogin.jsx";
import PatientSignup from "./pages/PatientSignup.jsx";
import FindDoctor from "./pages/FindDoctor.jsx";
import Admin from "./pages/Admin.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import NotFound from "./pages/NotFound.jsx";
import About from "./pages/About.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import Help from "./pages/Help.jsx";
import CookieConsent from "./components/CookieConsent.jsx";

const SPLASH_KEY = "medtrack.splashed";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

function RequireDoctor({ children }) {
  const { isDoctor, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!isDoctor) return <Navigate to="/login" replace />;
  return children;
}

// The patient portal is for patient accounts, OR for a doctor account that is
// ALSO a patient (owns its own patient records). A doctor-only account has no
// patient portal and is sent back to /app.
function RequirePatient({ children }) {
  const { canAccessPatientPortal, isDoctor, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (canAccessPatientPortal) return children;
  if (isDoctor) return <Navigate to="/app" replace />;
  return <Navigate to="/me/login" replace />;
}

// Operator-only console. Admins are allowlisted server-side (app_admins) and
// every admin RPC re-checks is_admin(), so this client gate is just UX.
function RequireAdmin({ children }) {
  const { isAdmin, loading, isAuthenticated } = useAuth();
  if (loading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return children;
}

// Guards routes that are off-limits in reception mode (medical records and
// clinic-wide settings). In reception mode the doctor's session is locked to
// inventory + appointments, so these redirect to the dashboard.
function RequireFullAccess({ children }) {
  const { receptionMode } = useAuth();
  if (receptionMode) return <Navigate to="/app" replace />;
  return children;
}

// Redirect the old single-clinic path to its slug-based profile.
function LegacyDraCeci() {
  return <Navigate to="/c/dra-ceci" replace />;
}

function LegacySlugRedirect({ to }) {
  const { slug } = useParams();
  return <Navigate to={`/c/${slug}/${to}`} replace />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_KEY)
  );

  function finishSplash() {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }

  if (showSplash) return <Splash onDone={finishSplash} />;

  return (
    <>
      <Routes>
        {/* Product marketing */}
        <Route path="/" element={<AppLanding />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Public doctor directory */}
        <Route path="/find" element={<FindDoctor />} />

        {/* Company / legal / support content */}
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/help" element={<Help />} />

        {/* Placeholder for not-yet-built pages (social links) */}
        <Route path="/coming-soon" element={<ComingSoon />} />

        {/* Public clinic profile + booking (slug-scoped) */}
        <Route path="/c/:slug" element={<Profile />} />
        <Route path="/c/:slug/book" element={<BookAppointment />} />
        <Route path="/c/:slug/manage" element={<ManageBooking />} />

        {/* Patient portal */}
        <Route path="/me/login" element={<PatientLogin />} />
        <Route path="/me/signup" element={<PatientSignup />} />
        <Route
          path="/me"
          element={
            <RequirePatient>
              <PatientHome />
            </RequirePatient>
          }
        />

        {/* Doctor app */}
        <Route
          path="/app"
          element={
            <RequireDoctor>
              <Layout>
                <Outlet />
              </Layout>
            </RequireDoctor>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route
            path="clients"
            element={
              <RequireFullAccess>
                <Clients />
              </RequireFullAccess>
            }
          />
          <Route path="appointments" element={<Appointments />} />
          <Route
            path="profile"
            element={
              <RequireFullAccess>
                <ProfileEdit />
              </RequireFullAccess>
            }
          />
          <Route
            path="settings"
            element={
              <RequireFullAccess>
                <Settings />
              </RequireFullAccess>
            }
          />
        </Route>

        {/* Operator / super-admin console */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        {/* Legacy redirects */}
        <Route path="/dra-ceci" element={<LegacyDraCeci />} />
        <Route path="/c/:slug/portal" element={<LegacySlugRedirect to="book" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
