import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await updatePassword(password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "err.noBackend");
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/app", { replace: true }), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-end">
          <LanguageToggle />
        </div>
        <div className="card p-8">
          <BrandMark size={48} rounded="rounded-2xl" className="mb-4" />
          {done ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <h1 className="text-xl font-bold text-slate-900">{t("auth.updated")}</h1>
              </div>
              <Link to="/app" className="btn-primary mt-4 w-full py-3">
                {t("nav.dashboard")}
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{t("auth.updateTitle")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("auth.updateSub")}</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label">{t("auth.newPassword")}</label>
                  <input
                    className="input"
                    type="password"
                    required
                    minLength={6}
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
                <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
                  <KeyRound size={18} /> {t("auth.updatePassword")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
