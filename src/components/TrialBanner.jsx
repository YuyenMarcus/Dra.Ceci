import { useState } from "react";
import { Clock, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { startCheckout } from "../lib/billing.js";

// Thin reminder bar shown inside the doctor app while a clinic is on its free
// trial or in the post-trial grace period. Locked clinics get the full Paywall
// instead, so this only handles "trial" and "grace" states.
export default function TrialBanner({ access }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  if (!access) return null;
  const { state, daysLeft, hoursLeft } = access;

  // Keep the trial bar from nagging early — only surface it in the final stretch.
  if (state === "trial" && daysLeft > 7) return null;
  if (state !== "trial" && state !== "grace") return null;

  async function subscribe() {
    setBusy(true);
    const res = await startCheckout("starter");
    if (!res.ok) setBusy(false); // on success the browser navigates to Stripe
  }

  const grace = state === "grace";
  const Icon = grace ? AlertTriangle : Clock;

  return (
    <div
      className={[
        "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 md:px-8",
        grace
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200",
      ].join(" ")}
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon size={16} className="shrink-0" />
        {grace
          ? t("trial.graceBanner", { hours: hoursLeft })
          : t("trial.banner", { days: daysLeft })}
      </p>
      <button
        type="button"
        onClick={subscribe}
        disabled={busy}
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60",
          grace
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-brand-600 text-white hover:bg-brand-700",
        ].join(" ")}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : null}
        {t("trial.subscribe")}
        {!busy && <ArrowRight size={14} />}
      </button>
    </div>
  );
}
