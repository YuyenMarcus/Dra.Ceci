import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Languages,
  Check,
  Share2,
  Link2,
  ExternalLink,
  Layers,
  ConciergeBell,
  LogIn,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertTriangle,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { updateClinic } from "../store/db.js";
import { startCheckout, openBillingPortal } from "../lib/billing.js";
import CommissionCalculator from "../components/CommissionCalculator.jsx";
import Modal from "../components/Modal.jsx";
import { PLANS, planFeatures } from "../lib/plans.js";

const LANGS = [
  { code: "es", labelKey: "settings.spanish", native: "Español" },
  { code: "en", labelKey: "settings.english", native: "English" },
];

// Temporarily hidden (code kept intact, just not surfaced in the UI).
const SHOW_RECEPTION = false;
const SHOW_COMMISSION = false;

export default function Settings() {
  const { lang, setLang, t } = useLang();
  const { clinic, refreshClinic, enterReception, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [billingNotice, setBillingNotice] = useState("");
  const [billingError, setBillingError] = useState("");
  const currentPlan = clinic?.profile?.plan || "starter";
  const hasBillingCustomer = Boolean(clinic?.profile?.stripe?.customerId);

  // Show a banner after returning from Stripe Checkout, and refresh the clinic
  // so the webhook-applied plan shows up (it may land a moment after redirect).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (!billing) return;
    setBillingNotice(billing === "success" ? "billing.success" : "billing.canceled");
    if (billing === "success") {
      setTimeout(() => refreshClinic(), 1500);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [refreshClinic]);

  async function subscribe(plan) {
    if (planBusy) return;
    if (PLANS.find((p) => p.id === plan)?.comingSoon) return;
    setPlanBusy(true);
    setBillingError("");
    const res = await startCheckout(plan);
    if (!res.ok) setBillingError(res.error || "billing.error");
    setPlanBusy(false);
  }

  async function manageBilling() {
    if (planBusy) return;
    setPlanBusy(true);
    setBillingError("");
    const res = await openBillingPortal();
    if (!res.ok) setBillingError(res.error || "billing.error");
    setPlanBusy(false);
  }

  const suspended = Boolean(clinic?.profile?.suspended);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteDetail, setDeleteDetail] = useState("");
  const confirmTarget = clinic?.slug || "";

  async function togglePause() {
    if (!clinic || pauseBusy) return;
    setPauseBusy(true);
    try {
      await updateClinic(clinic.id, {
        profile: { ...(clinic.profile || {}), suspended: !suspended },
      });
      await refreshClinic();
    } catch (err) {
      console.error(err);
    } finally {
      setPauseBusy(false);
    }
  }

  async function doDelete() {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    setDeleteDetail("");
    const res = await deleteAccount();
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(res.error || "account.deleteFailed");
      setDeleteDetail(res.detail || "");
      return;
    }
    navigate("/", { replace: true });
  }

  const savedPin = clinic?.profile?.receptionPin || "";
  const [pin, setPin] = useState(savedPin);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  async function savePin() {
    if (!clinic || pinBusy) return;
    setPinBusy(true);
    try {
      await updateClinic(clinic.id, {
        profile: { ...(clinic.profile || {}), receptionPin: pin.trim() },
      });
      await refreshClinic();
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setPinBusy(false);
    }
  }

  function startReception() {
    if (enterReception()) navigate("/app", { replace: true });
  }

  const profilePath = `/c/${clinic?.slug ?? ""}`;
  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${profilePath}`
      : profilePath;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Row 1: compact cards — public profile link + language */}
      <div className="grid gap-6 lg:grid-cols-2">
      {/* Public profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Share2 size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              {t("settings.profileTitle")}
            </h2>
            <p className="text-sm text-slate-500">{t("settings.profileHint")}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Link2 size={16} className="shrink-0 text-slate-400" />
          <span className="truncate text-sm text-slate-700">{profileUrl}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={copyLink} className="btn-primary">
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {copied ? t("profile.copied") : t("profile.copyLink")}
          </button>
          <Link to={profilePath} className="btn-outline">
            <ExternalLink size={16} /> {t("settings.viewProfile")}
          </Link>
        </div>
      </div>

      {/* Language */}
      <div className="card p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Languages size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t("settings.language")}</h2>
            <p className="text-sm text-slate-500">{t("settings.languageHint")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-brand-500 bg-brand-50/60"
                    : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {l.native}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {t(l.labelKey)}
                  </span>
                </span>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </div>

      {/* Plan tier (internal flag until billing is connected) */}
      <div className="card p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Layers size={20} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">{t("plan.title")}</h2>
            <p className="text-sm text-slate-500">{t("plan.hint")}</p>
          </div>
          {hasBillingCustomer && (
            <button
              type="button"
              onClick={manageBilling}
              disabled={planBusy}
              className="btn-outline shrink-0 text-sm disabled:opacity-60"
            >
              <CreditCard size={15} /> {t("billing.manage")}
            </button>
          )}
        </div>

        {billingNotice && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              billingNotice === "billing.success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {t(billingNotice)}
          </div>
        )}
        {billingError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle size={16} /> {t(billingError)}
          </div>
        )}

        <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-3">
          {PLANS.map((p) => {
            const active = currentPlan === p.id;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-xl border p-5 transition ${
                  active
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      <Check size={12} /> {t("plan.current")}
                    </span>
                  ) : p.comingSoon ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {t("plan.comingSoon")}
                    </span>
                  ) : p.highlight ? (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                      {t("plan.popular")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-slate-500">
                  <span className="text-2xl font-bold text-slate-900">
                    ${p.price}
                  </span>
                  {t("plan.perMonth")}
                </p>
                <ul className="mt-4 grid flex-1 content-start gap-1.5 text-sm text-slate-600">
                  {planFeatures(p.id, lang).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-brand-500"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {!active &&
                  (p.comingSoon ? (
                    <button
                      type="button"
                      disabled
                      className="btn mt-4 w-full cursor-default justify-center border border-slate-200 bg-slate-50 text-sm text-slate-400"
                    >
                      {t("plan.comingSoon")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={planBusy}
                      onClick={() => subscribe(p.id)}
                      className="btn-primary mt-4 w-full justify-center text-sm disabled:opacity-60"
                    >
                      {planBusy ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CreditCard size={15} />
                      )}
                      {t("plan.subscribe")}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reception access (front desk) — temporarily hidden (code kept). */}
      {SHOW_RECEPTION && (
      <div className="card p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ConciergeBell size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t("reception.title")}</h2>
            <p className="text-sm text-slate-500">{t("reception.hint")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:max-w-sm">
          <label className="label mb-0">{t("reception.pinLabel")}</label>
          <div className="flex gap-2">
            <input
              className="input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder={t("reception.pinPlaceholder")}
            />
            <button
              type="button"
              className="btn-outline shrink-0"
              disabled={pinBusy || pin.trim().length < 4 || pin.trim() === savedPin}
              onClick={savePin}
            >
              {pinSaved ? <Check size={16} /> : null}
              {pinSaved ? t("reception.pinSaved") : t("reception.savePin")}
            </button>
          </div>
          <p className="text-xs text-slate-400">{t("reception.pinHelp")}</p>
        </div>

        <button
          type="button"
          className="btn-primary mt-4 disabled:opacity-60"
          disabled={!savedPin}
          onClick={startReception}
        >
          <LogIn size={16} /> {t("reception.enter")}
        </button>
        {!savedPin && (
          <p className="mt-2 text-xs text-amber-600">{t("reception.needPin")}</p>
        )}
      </div>
      )}

      {/* Commission calculator — temporarily hidden (code kept). */}
      {SHOW_COMMISSION && <CommissionCalculator />}

      {/* Account: pause public bookings or delete permanently */}
      <div className="card border-rose-200 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t("account.title")}</h2>
            <p className="text-sm text-slate-500">{t("account.hint")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {suspended ? t("account.pausedTitle") : t("account.activeTitle")}
              </p>
              <p className="text-xs text-slate-500">
                {suspended ? t("account.pausedHint") : t("account.activeHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePause}
              disabled={pauseBusy}
              className="btn-outline shrink-0 disabled:opacity-60"
            >
              {pauseBusy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : suspended ? (
                <PlayCircle size={16} />
              ) : (
                <PauseCircle size={16} />
              )}
              {suspended ? t("account.reactivate") : t("account.pause")}
            </button>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/40 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-rose-700">{t("account.deleteTitle")}</p>
              <p className="text-xs text-rose-600/80">{t("account.deleteHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmText("");
                setDeleteError("");
                setDeleteOpen(true);
              }}
              className="btn-danger shrink-0"
            >
              <Trash2 size={16} /> {t("account.delete")}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("account.deleteTitle")}
        footer={
          <>
            <button className="btn-outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn-danger disabled:opacity-60"
              disabled={deleteBusy || confirmText.trim() !== confirmTarget}
              onClick={doDelete}
            >
              {deleteBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t("account.deleteConfirm")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {t("account.deleteWarning")}
          </p>
          <p className="text-sm text-slate-600">
            {t("account.deletePrompt")}{" "}
            <span className="font-mono font-semibold text-slate-900">{confirmTarget}</span>
          </p>
          <input
            className="input"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmTarget}
          />
          {deleteError && (
            <div>
              <p className="text-sm font-medium text-rose-600">{t(deleteError)}</p>
              {deleteDetail && (
                <p className="mt-1 break-words font-mono text-xs text-rose-500/80">
                  {deleteDetail}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
