import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, RotateCw, MailCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";

// Email confirmation by 6-digit code (instead of a magic link). Reusable on the
// sign-up "check your email" screens and the login "email not confirmed" path.
// Rendered as plain markup (not a <form>) so it can safely nest inside the login
// form without producing invalid nested <form> elements.
export default function OtpConfirm({ email, redirectTo }) {
  const { verifyOtp, resendCode } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function verify() {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError("");
    const res = await verifyOtp(email, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "auth.invalidCode");
      return;
    }
    navigate(redirectTo || (res.role === "doctor" ? "/app" : "/me"), {
      replace: true,
    });
  }

  async function resend() {
    setResending(true);
    setError("");
    setResent(false);
    const res = await resendCode(email);
    setResending(false);
    if (res.ok) setResent(true);
    else setError(res.error || "err.noBackend");
  }

  return (
    <div className="mt-5 text-left">
      <label className="label">{t("auth.codeLabel")}</label>
      <input
        className="input text-center text-2xl font-semibold tracking-[0.5em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          setError("");
          setResent(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            verify();
          }
        }}
        placeholder="000000"
      />
      {error && (
        <p className="mt-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
          {t(error)}
        </p>
      )}
      <button
        type="button"
        onClick={verify}
        disabled={busy || code.length < 6}
        className="btn-primary mt-3 w-full py-3 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ShieldCheck size={18} />
        )}
        {t("auth.verify")}
      </button>

      <div className="mt-3 text-center text-sm">
        {resent ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
            <MailCheck size={15} /> {t("auth.codeSent")}
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
          >
            {resending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCw size={14} />
            )}
            {t("auth.resendCode")}
          </button>
        )}
      </div>
    </div>
  );
}
