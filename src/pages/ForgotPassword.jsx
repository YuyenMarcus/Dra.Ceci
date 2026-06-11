import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, MailCheck } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await resetPassword(email);
    setBusy(false);
    if (!res?.ok) {
      setError(res?.error || "err.generic");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} /> {t("auth.backToLogin")}
          </Link>
          <LanguageToggle />
        </div>

        <div className="card p-8">
          <BrandMark size={48} rounded="rounded-2xl" className="mb-4" />
          {sent ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-emerald-600">
                <MailCheck size={20} />
                <h1 className="text-xl font-bold text-slate-900">{t("auth.checkEmail")}</h1>
              </div>
              <p className="text-sm text-slate-500">{t("auth.resetSent")}</p>
              <Link to="/login" className="btn-primary mt-6 w-full py-3">
                {t("auth.backToLogin")}
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{t("auth.forgotTitle")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("auth.forgotSub")}</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label">{t("login.email")}</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                  />
                </div>
                {error && (
                  <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                    {t(error)}
                  </p>
                )}
                <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
                  <Send size={18} /> {t("auth.sendLink")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
