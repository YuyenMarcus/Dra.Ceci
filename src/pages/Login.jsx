import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, ArrowLeft, LogIn, CalendarPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ResendConfirmation from "../components/ResendConfirmation.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login, isDoctor, isClient, loading } = useAuth();
  const { t } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (isDoctor) navigate("/app", { replace: true });
    else if (isClient) navigate("/me", { replace: true });
  }, [isDoctor, isClient, loading, navigate]);

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
    // Patients (and any non-doctor account) land in the patient portal.
    navigate(res.role === "doctor" ? "/app" : "/me", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex lg:w-2/5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Stethoscope size={20} />
          </div>
          <span className="text-xl font-bold">Clinika</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t("login.welcomeBack")}</h2>
          <p className="mt-3 max-w-sm text-white/80">{t("login.brandSub")}</p>
        </div>
        <p className="text-sm text-white/60">{t("app.tagline")}</p>
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

          <h1 className="text-2xl font-bold text-slate-900">{t("login.doctorTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("login.patientsNoAccount")}{" "}
            <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
              {t("login.bookHere")}
            </Link>
            .
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
                placeholder="you@clinic.com"
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
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <p className="text-sm text-slate-600">{t("auth.confirmSent")}</p>
                <ResendConfirmation email={email} redirectPath="/login" />
              </div>
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
              <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
                {t("login.createOne")}
              </Link>
            </span>
          </div>

          <Link
            to="/me/login"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            <CalendarPlus size={16} /> {t("login.patientSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
