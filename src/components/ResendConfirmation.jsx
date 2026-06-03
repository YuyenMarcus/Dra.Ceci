import { useState } from "react";
import { MailCheck, Send, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";

// Small inline control to resend the sign-up confirmation email. Drop it under
// a login error ("email not confirmed") or on the "check your email" screen.
export default function ResendConfirmation({ email, redirectPath = "/login" }) {
  const { resendConfirmation } = useAuth();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function resend() {
    setBusy(true);
    setErr("");
    setSent(false);
    const res = await resendConfirmation(email, redirectPath);
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr(res.error || "err.noBackend");
  }

  if (sent) {
    return (
      <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600">
        <MailCheck size={15} /> {t("auth.resendSent")}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={resend}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {t("auth.resendConfirmation")}
      </button>
      {err && <p className="mt-1 text-xs font-medium text-rose-600">{t(err)}</p>}
    </div>
  );
}
