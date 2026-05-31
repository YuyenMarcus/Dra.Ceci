import { Languages } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";

// Compact ES / EN switch used in public page headers.
export default function LanguageToggle({ className = "" }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5 ${className}`}
      title={t("lang.toggle")}
    >
      <Languages size={14} className="ml-1.5 text-slate-400" />
      {["es", "en"].map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
            lang === code
              ? "bg-brand-600 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
