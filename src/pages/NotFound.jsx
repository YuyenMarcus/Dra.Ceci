import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="text-lg font-bold text-slate-900">Clinika</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="max-w-md text-center">
          <p className="bg-gradient-to-b from-brand-500 to-brand-700 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
            404
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("notFound.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-slate-500">
            {t("notFound.sub")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/" className="btn-primary px-6 py-3 text-base">
              <Home size={18} /> {t("notFound.back")}
            </Link>
            <Link to="/find" className="btn-outline px-6 py-3 text-base">
              <Search size={18} /> {t("notFound.find")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
