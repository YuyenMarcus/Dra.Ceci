import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";

const CONSENT_KEY = "medtrack.cookieConsent";

export default function CookieConsent() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function decide(choice) {
    localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4 animate-fade-up">
      <div className="card flex w-full max-w-3xl flex-col gap-4 p-5 shadow-xl sm:flex-row sm:items-center sm:gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Cookie size={22} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{t("cookie.title")}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("cookie.body")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            className="btn-ghost text-sm"
            onClick={() => decide("essential")}
          >
            {t("cookie.essential")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => decide("all")}
          >
            {t("cookie.acceptAll")}
          </button>
          <button
            onClick={() => decide("essential")}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("cookie.dismiss")}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
