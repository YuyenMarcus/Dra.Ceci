import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Stethoscope,
  ArrowLeft,
  LogIn,
  Zap,
  CalendarPlus,
  User,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useStore } from "../store/StoreContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginClient, isAuthenticated, role } = useAuth();
  const { doctors, clients } = useStore();
  const { t } = useLang();

  const [mode, setMode] = useState("client"); // "client" | "doctor"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isDoctorMode = mode === "doctor";

  // Once authenticated, send doctors to the app and patients to their portal.
  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(role === "doctor" ? "/app" : "/me", { replace: true });
  }, [isAuthenticated, role, navigate]);

  function switchMode(next) {
    setMode(next);
    setEmail("");
    setPassword("");
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    const res = isDoctorMode
      ? login(email, password)
      : loginClient(email, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate(res.role === "doctor" ? "/app" : "/me", { replace: true });
  }

  function quickLogin(account) {
    const res = isDoctorMode
      ? login(account.email, account.password)
      : loginClient(account.email, account.password);
    if (res.ok) navigate(res.role === "doctor" ? "/app" : "/me", { replace: true });
  }

  const quickAccounts = isDoctorMode
    ? doctors
    : clients.filter((c) => c.email && c.password);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex lg:w-2/5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Stethoscope size={20} />
          </div>
          <span className="text-xl font-bold">MedTrack</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t("login.welcomeBack")}</h2>
          <p className="mt-3 max-w-sm text-white/80">{t("login.brandSub")}</p>
        </div>
        <p className="text-sm text-white/60">{t("login.demoEnv")}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={16} /> {t("login.backHome")}
            </Link>
            <LanguageToggle />
          </div>

          {/* Role tabs — the space where patients and doctors choose how to sign in */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => switchMode("client")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                !isDoctorMode
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <User size={16} /> {t("login.tabClient")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("doctor")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                isDoctorMode
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Stethoscope size={16} /> {t("login.tabDoctor")}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {isDoctorMode ? t("login.doctorTitle") : t("login.clientTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isDoctorMode ? (
              <>
                {t("login.patientsNoAccount")}{" "}
                <Link to="/book" className="font-medium text-brand-600 hover:text-brand-700">
                  {t("login.bookHere")}
                </Link>
                .
              </>
            ) : (
              t("login.clientSub")
            )}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">{t("login.email")}</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder={isDoctorMode ? "you@clinic.dev" : "tu@correo.com"}
              />
            </div>
            <div>
              <label className="label">{t("login.password")}</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                {t(error)}
              </p>
            )}
            <button type="submit" className="btn-primary w-full py-3">
              <LogIn size={18} /> {t("login.signIn")}
            </button>
          </form>

          {/* Demo quick-login */}
          <div className="mt-7">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Zap size={13} /> {isDoctorMode ? t("login.quickDemo") : t("login.clientQuick")}
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {quickAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => quickLogin(acc)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      {acc.name}
                    </span>
                    <span className="block text-xs text-slate-400">{acc.email}</span>
                  </span>
                  <span className="text-xs font-semibold text-brand-600">{t("login.use")}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              {t("login.allPasswords")} <span className="font-mono">demo1234</span>
            </p>
          </div>

          <Link
            to="/book"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            <CalendarPlus size={16} /> {t("login.imPatient")}
          </Link>
        </div>
      </div>
    </div>
  );
}
