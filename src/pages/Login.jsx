import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, HeartPulse } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ResendConfirmation from "../components/ResendConfirmation.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login, isDoctor, isClient, loading } = useAuth();
  const { t } = useLang();
  useSeo({ title: t("seo.loginTitle"), description: t("seo.loginDesc"), path: "/login" });

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
      <div className="animate-slide-in-left relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex lg:w-2/5">
        {/* Soft drifting glows for a bit of life behind the copy */}
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl"
          style={{ animationDuration: "9s", animationDelay: "1.2s" }}
        />
        <Link to="/" className="animate-fade-in relative flex items-center gap-2.5">
          <BrandMark size={40} />
          <span className="brand-text-light text-xl">Clinika</span>
        </Link>
        <div className="stagger relative">
          <h2
            className="bg-gradient-to-r from-white via-brand-200 to-white bg-clip-text text-3xl font-bold leading-tight text-transparent"
            style={{
              backgroundSize: "200% 100%",
              animation:
                "mt-fade-up .5s cubic-bezier(.21,1.02,.73,1) .04s both, mt-gradient-pan 5s linear 1.2s infinite",
            }}
          >
            {t("login.welcomeBack")}
          </h2>
          <p className="mt-3 max-w-sm text-white/80">{t("login.brandSub")}</p>
        </div>
        <p
          className="animate-fade-in relative text-sm text-white/60"
          style={{ animationDelay: "0.5s" }}
        >
          {t("app.tagline")}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="animate-fade-up w-full max-w-md"
          style={{ animationDelay: "0.12s" }}
        >
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
          <p className="mt-1 text-sm text-slate-500">{t("login.doctorSubtitle")}</p>

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

          <p className="mt-6 text-center text-xs text-slate-400">{t("login.doctorOnlyNote")}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-slate-100 pt-5 text-sm text-slate-500 dark:border-slate-800">
            <HeartPulse size={14} className="text-portal-500" />
            <span>{t("login.patientPrompt")}</span>
            <Link
              to="/find"
              className="font-medium text-portal-600 hover:text-portal-700 dark:text-portal-300 dark:hover:text-portal-200"
            >
              {t("login.patientBook")}
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              to="/me/login"
              className="font-medium text-portal-600 hover:text-portal-700 dark:text-portal-300 dark:hover:text-portal-200"
            >
              {t("login.patientPortal")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
