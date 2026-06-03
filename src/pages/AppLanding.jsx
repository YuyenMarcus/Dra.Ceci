import { Link } from "react-router-dom";
import {
  Stethoscope,
  ArrowRight,
  Boxes,
  ClipboardList,
  CalendarDays,
  Globe2,
  CalendarCheck2,
  LayoutDashboard,
  Languages,
  Share2,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

function FeatureCard({ icon: Icon, title, children, delay = 0 }) {
  return (
    <div
      className="card animate-fade-up p-6"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{children}</p>
    </div>
  );
}

export default function AppLanding() {
  const { t } = useLang();
  const { isDoctor, isClient, canAccessPatientPortal, clinic } = useAuth();
  const profileTo = isDoctor && clinic?.slug ? `/c/${clinic.slug}` : "/signup";
  // Secondary CTA: doctors view their own public profile, everyone else is
  // pointed at creating a clinic (no more "example profile" framing).
  const secondaryLabel = isDoctor ? t("app.navProfile") : t("login.createOne");
  const sampleName = isDoctor && clinic?.name ? clinic.name : t("app.profileSampleName");
  const sampleUrl =
    isDoctor && clinic?.slug ? `medtrack.app/${clinic.slug}` : t("app.profileSampleUrl");

  const features = [
    {
      icon: Boxes,
      title: t("app.feat.inventoryTitle"),
      desc: t("app.feat.inventoryDesc"),
    },
    {
      icon: ClipboardList,
      title: t("app.feat.recordsTitle"),
      desc: t("app.feat.recordsDesc"),
    },
    {
      icon: CalendarDays,
      title: t("app.feat.scheduleTitle"),
      desc: t("app.feat.scheduleDesc"),
    },
    {
      icon: CalendarCheck2,
      title: t("app.feat.bookingTitle"),
      desc: t("app.feat.bookingDesc"),
    },
    {
      icon: LayoutDashboard,
      title: t("app.feat.dashboardTitle"),
      desc: t("app.feat.dashboardDesc"),
    },
    {
      icon: Languages,
      title: t("app.feat.bilingualTitle"),
      desc: t("app.feat.bilingualDesc"),
    },
  ];

  const primaryTo = isDoctor ? "/app" : isClient ? "/me" : "/login";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Stethoscope size={18} />
            </div>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold text-slate-900">MedTrack</span>
              <span className="text-[11px] font-medium text-slate-400">
                {t("app.tagline")}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="mr-1" />
            <Link
              to={canAccessPatientPortal ? "/me" : "/me/login"}
              className="btn-ghost hidden sm:inline-flex"
            >
              {t("app.patientPortal")}
            </Link>
            <Link to={profileTo} className="btn-ghost hidden sm:inline-flex">
              {t("app.navProfile")}
            </Link>
            <Link to={primaryTo} className="btn-primary">
              {isClient ? t("app.goToPortal") : t("app.login")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:py-28">
          <span
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700"
            style={{ animationDelay: ".05s" }}
          >
            <Stethoscope size={14} /> {t("app.heroKicker")}
          </span>
          <h1
            className="animate-fade-up mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl"
            style={{ animationDelay: ".12s" }}
          >
            {t("app.heroTitle")}{" "}
            <span className="text-brand-600">{t("app.heroTitleEm")}</span>.
          </h1>
          <p
            className="animate-fade-up mx-auto mt-5 max-w-xl text-lg text-slate-500"
            style={{ animationDelay: ".2s" }}
          >
            {t("app.heroSub")}
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: ".28s" }}
          >
            <Link to={primaryTo} className="btn-primary px-6 py-3 text-base">
              {t("app.getStarted")} <ArrowRight size={18} />
            </Link>
            <Link to={profileTo} className="btn-outline px-6 py-3 text-base">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            {t("app.featuresTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-slate-500">
            {t("app.featuresSub")}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} delay={i * 0.05}>
                {f.desc}
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>

      {/* Shareable profile highlight */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="card grid items-center gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Share2 size={14} /> {t("app.feat.bookingTitle")}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {t("app.profileTitle")}
            </h2>
            <p className="mt-3 max-w-md text-slate-500">{t("app.profileSub")}</p>
            <Link to={profileTo} className="btn-primary mt-6 px-6 py-3 text-base">
              {secondaryLabel} <ArrowRight size={18} />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{sampleName}</p>
                  <p className="text-xs text-slate-400">{sampleUrl}</p>
                </div>
                <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {t("landing.bookAppointment")}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Globe2 size={14} className="text-brand-500" />
                {t("app.feat.bookingDesc")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="card flex flex-col items-center gap-5 bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-12 text-center text-white">
          <h2 className="max-w-xl text-3xl font-bold">{t("app.ctaTitle")}</h2>
          <p className="max-w-md text-brand-100">{t("app.ctaSub")}</p>
          <Link
            to={primaryTo}
            className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50"
          >
            {t("app.getStarted")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        MedTrack · {t("app.footerNote")}
      </footer>
    </div>
  );
}
