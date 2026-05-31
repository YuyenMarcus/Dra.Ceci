import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore } from "../store/StoreContext.jsx";

const SESSION_KEY = "medtrack.session.v1";
const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Doctors and patients (clients) can both sign in. Patients can also book
  // without an account; logging in just personalizes their experience.
  const { doctors, clients } = useStore();
  const [session, setSession] = useState(loadSession);

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  // Resolve the active user (doctor or client) from the persisted session.
  const currentUser = useMemo(() => {
    if (!session) return null;
    if (session.role === "client") {
      const found = clients.find((u) => u.id === session.id);
      return found ? { ...found, role: "client" } : null;
    }
    const found = doctors.find((u) => u.id === session.id);
    return found ? { ...found, role: "doctor" } : null;
  }, [session, doctors, clients]);

  const login = useCallback(
    (email, password) => {
      const normalized = email.trim().toLowerCase();
      const match = doctors.find(
        (u) => u.email.toLowerCase() === normalized && u.password === password
      );
      if (!match) {
        return { ok: false, error: "err.incorrectLogin" };
      }
      setSession({ role: "doctor", id: match.id });
      return { ok: true, role: "doctor" };
    },
    [doctors]
  );

  const loginClient = useCallback(
    (email, password) => {
      const normalized = email.trim().toLowerCase();
      const match = clients.find(
        (u) =>
          (u.email || "").toLowerCase() === normalized &&
          u.password === password
      );
      if (!match) {
        return { ok: false, error: "err.incorrectLogin" };
      }
      setSession({ role: "client", id: match.id });
      return { ok: true, role: "client" };
    },
    [clients]
  );

  const logout = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      session,
      currentUser,
      role: currentUser?.role ?? null,
      isAuthenticated: !!currentUser,
      isDoctor: currentUser?.role === "doctor",
      isClient: currentUser?.role === "client",
      login,
      loginClient,
      logout,
    }),
    [session, currentUser, login, loginClient, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
