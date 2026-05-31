import { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Splash from "./components/Splash.jsx";
import AppLanding from "./pages/AppLanding.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Clients from "./pages/Clients.jsx";
import Appointments from "./pages/Appointments.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import ManageBooking from "./pages/ManageBooking.jsx";
import Settings from "./pages/Settings.jsx";
import PatientHome from "./pages/PatientHome.jsx";
import CookieConsent from "./components/CookieConsent.jsx";

const SPLASH_KEY = "medtrack.splashed";

function RequireDoctor({ children }) {
  const { isDoctor } = useAuth();
  if (!isDoctor) return <Navigate to="/login" replace />;
  return children;
}

function RequireClient({ children }) {
  const { isClient } = useAuth();
  if (!isClient) return <Navigate to="/login" replace />;
  return children;
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
      {/* Public */}
      <Route path="/" element={<AppLanding />} />
      <Route path="/dra-ceci" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/manage" element={<ManageBooking />} />

      {/* Patient portal */}
      <Route
        path="/me"
        element={
          <RequireClient>
            <PatientHome />
          </RequireClient>
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
        <Route path="clients" element={<Clients />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Legacy portal path now points at public booking */}
      <Route path="/portal" element={<Navigate to="/book" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
