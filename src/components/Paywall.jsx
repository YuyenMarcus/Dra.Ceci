import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CreditCard, LogOut, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import { startCheckout, openBillingPortal } from "../lib/billing.js";
import { getPlan } from "../lib/plans.js";
import BrandMark from "./BrandMark.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
import LanguageToggle from "./LanguageToggle.jsx";

// Full-screen lock shown when a clinic's trial + grace period have lapsed with
// no active subscription. The doctor can subscribe, manage existing billing, or
// sign out — nothing else in the app is reachable until billing is active.
export default function Paywall() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { clinic, refreshClinic, logout } = useAuth();
  useSeo({ title: "Clinika", noindex: true });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasBillingCustomer = Boolean(clinic?.profile?.stripe?.customerId);
  const starter = getPlan("starter");

  // If we just came back from a successful checkout, the webhook may take a
  // moment to flip the profile to active. Poll refreshClinic a few times so the
  // gate lifts on its own without the doctor having to reload.
  const polling = useRef(false);
  const [activating, setActivating] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "success" || polling.current) return undefined;
    polling.current = true;
    setActivating(true);
    let tries = 0;
    let timer;
    const tick = async () => {
      tries += 1;
      await refreshClinic();
      // The parent unmounts this component the moment access becomes active; if
      // we're still here after several tries, give up the spinner.
      if (tries >= 6) {
        setActivating(false);
        return;
      }
      timer = setTimeout(tick, 2500);
    };
    timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, [refreshClinic]);

  async function subscribe() {
    setBusy(true);
    setError("");
    const res = await startCheckout("starter");
    if (!res.ok) {
      setError(res.error || "billing.error");
      setBusy(false);
    }
  }

  async function manage() {
    setBusy(true);
    setError("");
    const res = await openBillingPortal();
    if (!res.ok) {
      setError(res.error || "billing.error");
      setBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={34} />
          <span className="brand-text text-lg">Clinika</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col items-center px-5 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <Lock size={26} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
          {t("paywall.title")}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{t("paywall.body")}</p>

        {activating && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-300">
            <Loader2 size={16} className="animate-spin" /> {t("paywall.activating")}
          </p>
        )}

        <div className="card mt-8 w-full p-6 text-left">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-slate-900 dark:text-white">{starter.name}</p>
            <p className="text-slate-900 dark:text-white">
              <span className="text-2xl font-bold">${starter.price}</span>
              <span className="text-sm text-slate-400"> {t("plan.perMonth")}</span>
            </p>
          </div>
          <ul className="mt-4 space-y-2">
            {(starter.features[lang] || starter.features.es).slice(0, 5).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Check size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-600">
              <AlertTriangle size={16} /> {t(error)}
            </p>
          )}

          <button
            type="button"
            onClick={subscribe}
            disabled={busy}
            className="btn-primary mt-5 w-full py-3 text-base disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {t("paywall.subscribe")}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">{t("paywall.priceNote")}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {hasBillingCustomer && (
            <button
              type="button"
              onClick={manage}
              disabled={busy}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t("billing.manage")}
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <LogOut size={15} /> {t("layout.signOut")}
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-400">{t("paywall.dataSafe")}</p>
      </main>
    </div>
  );
}
