import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, ArrowLeft, LogIn, CalendarPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ResendConfirmation from "../components/ResendConfirmation.jsx";

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, isDoctor, isClient, canSwitchRoles, loading } = useAuth();
  const { t } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Doctor-only accounts go to /app. Patient accounts and dual-role doctors
  // (also registered as patients) land in the patient portal.
  useEffect(() => {
    if (loading) return;
    if (isDoctor && !canSwitchRoles) navigate("/app", { replace: true });
    else if (isClient || canSwitchRoles) navigate("/me", { replace: true });
  }, [isDoctor, isClient, canSwitchRoles, loading, navigate]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const doctorOnly = res.role === "doctor" && !res.hasPatientProfile;
    navigate(doctorOnly ? "/app" : "/me", { replace: true });
  }

  return (
    <div className="portal-scope flex min-h-screen items-center justify-center bg-slate-100 p-6">
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

        <div className="card p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-portal-100 text-portal-600">
            <Stethoscope size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("plogin.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("plogin.sub")}</p>

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
                placeholder="you@example.com"
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
            {error === "err.emailNotConfirmed" && (
              <ResendConfirmation email={email} redirectPath="/me/login" />
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
              <LogIn size={18} /> {t("login.signIn")}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
              {t("login.forgot")}
            </Link>
            <span className="text-slate-500">
              {t("login.noAccount")}{" "}
              <Link to="/me/signup" className="font-medium text-brand-600 hover:text-brand-700">
                {t("plogin.createOne")}
              </Link>
            </span>
          </div>

          <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">
            <CalendarPlus size={13} className="mr-1 inline" />
            {t("plogin.noAccountNeeded")}
          </p>
        </div>
      </div>
    </div>
  );
}
