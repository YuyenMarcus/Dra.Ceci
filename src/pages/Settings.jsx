import { useState } from "react";
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
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { updateClinic } from "../store/db.js";
import CommissionCalculator from "../components/CommissionCalculator.jsx";

const LANGS = [
  { code: "es", labelKey: "settings.spanish", native: "Español" },
  { code: "en", labelKey: "settings.english", native: "English" },
];

const PLANS = [
  { id: "starter", labelKey: "plan.starter" },
  { id: "profesional", labelKey: "plan.profesional" },
  { id: "hacienda", labelKey: "plan.hacienda" },
];

export default function Settings() {
  const { lang, setLang, t } = useLang();
  const { clinic, refreshClinic, enterReception } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const currentPlan = clinic?.profile?.plan || "starter";

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

  async function setPlan(plan) {
    if (!clinic || plan === currentPlan || planBusy) return;
    setPlanBusy(true);
    try {
      await updateClinic(clinic.id, {
        profile: { ...(clinic.profile || {}), plan },
      });
      await refreshClinic();
    } catch (err) {
      console.error(err);
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
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

      {/* Plan tier (internal flag until billing is connected) */}
      <div className="card p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t("plan.title")}</h2>
            <p className="text-sm text-slate-500">{t("plan.hint")}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={planBusy}
              onClick={() => setPlan(p.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                currentPlan === p.id
                  ? "border-brand-500 bg-brand-50/60"
                  : "border-slate-200 hover:border-brand-300"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{t(p.labelKey)}</span>
              {currentPlan === p.id && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reception access (front desk) */}
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

      <CommissionCalculator />

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
  );
}
