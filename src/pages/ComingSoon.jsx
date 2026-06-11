import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";

export default function ComingSoon() {
  const { t } = useLang();
  useSeo({ title: `${t("comingSoon.title")} | Clinika`, noindex: true });
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="brand-text text-lg">Clinika</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Clock size={30} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t("comingSoon.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-slate-500">
            {t("comingSoon.sub")}
          </p>
          <Link to="/" className="btn-primary mt-8 px-6 py-3 text-base">
            <ArrowLeft size={18} /> {t("comingSoon.back")}
          </Link>
        </div>
      </main>
    </div>
  );
}
