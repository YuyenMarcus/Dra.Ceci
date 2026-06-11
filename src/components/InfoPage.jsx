import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import BrandMark from "./BrandMark.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";

/**
 * Shared layout for static content pages (About, Privacy, Terms, Help).
 *
 * `content` is `{ es: {...}, en: {...} }` where each locale provides:
 *   title, sub, updated (optional date line), sections: [{ h, body?: [..], list?: [..] }]
 * Sections render as simple prose; body strings are paragraphs, list strings
 * are bullet items. SEO title/description come from the active locale.
 */
export default function InfoPage({ content, path, seoDescription }) {
  const { lang, t } = useLang();
  const c = content[lang] || content.es;

  useSeo({
    title: `${c.title} | Clinika`,
    description: seoDescription?.[lang] || c.sub,
    path,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="brand-text text-lg">Clinika</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" />
            <Link to="/" className="btn-ghost text-sm" title={t("common.back")}>
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">{t("common.back")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Title */}
      <div className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-500">{c.sub}</p>
          {c.updated && (
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
              {c.updated}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-5 py-12">
        <div className="space-y-10">
          {c.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold text-slate-900">{s.h}</h2>
              {(s.body || []).map((p, j) => (
                <p key={j} className="mt-3 leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="mt-3 space-y-2 text-slate-600">
                  {s.list.map((li, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      <span className="leading-relaxed">{li}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(s.tail || []).map((p, j) => (
                <p key={j} className="mt-3 leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Contact card */}
        <div className="card mt-14 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{c.contactTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{c.contactSub}</p>
          </div>
          <a href="mailto:team@clinika.health" className="btn-primary shrink-0">
            <Mail size={16} /> team@clinika.health
          </a>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-slate-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Nitron Digital LLC · Clinika.{" "}
            {t("footer.rights")}
          </p>
          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/about" className="hover:text-brand-700">{t("footer.about")}</Link>
            <Link to="/help" className="hover:text-brand-700">{t("footer.help")}</Link>
            <Link to="/terms" className="hover:text-brand-700">{t("footer.terms")}</Link>
            <Link to="/privacy" className="hover:text-brand-700">{t("footer.privacy")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
