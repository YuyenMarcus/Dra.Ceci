import { useState } from "react";
import { Link } from "react-router-dom";
import { Languages, Check, Share2, Link2, ExternalLink } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";

const LANGS = [
  { code: "es", labelKey: "settings.spanish", native: "Español" },
  { code: "en", labelKey: "settings.english", native: "English" },
];

export default function Settings() {
  const { lang, setLang, t } = useLang();
  const [copied, setCopied] = useState(false);

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dra-ceci`
      : "/dra-ceci";

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
          <Link to="/dra-ceci" className="btn-outline">
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
  );
}
