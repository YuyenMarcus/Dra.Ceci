import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import { LiquidButton } from "../components/ui/liquid-glass-button.jsx";
import AppPreview from "../components/ui/app-preview.jsx";
import HeroScroll from "../components/ui/hero-scroll-animation.jsx";
import { Footer2 } from "../components/ui/footer2.jsx";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  CalendarDays,
  CalendarCheck2,
  LayoutDashboard,
  Languages,
  Share2,
  Globe2,
  Stethoscope,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function AppLanding() {
  const { t } = useLang();
  const { isDoctor, isClient, canAccessPatientPortal, clinic } = useAuth();
  const profileTo = isDoctor && clinic?.slug ? `/c/${clinic.slug}` : "/signup";
  // Secondary CTA: doctors view their own public profile, everyone else is
  // pointed at creating a clinic (no more "example profile" framing).
  const secondaryLabel = isDoctor ? t("app.navProfile") : t("login.createOne");
  const sampleName = isDoctor && clinic?.name ? clinic.name : t("app.profileSampleName");
  const sampleUrl =
    isDoctor && clinic?.slug ? `clinika.health/${clinic.slug}` : t("app.profileSampleUrl");

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
  const portalTo = canAccessPatientPortal ? "/me" : "/me/login";

  const footerMenu = [
    {
      title: t("footer.product"),
      links: [
        { text: t("footer.features"), url: "#features" },
        { text: t("footer.booking"), url: "/find" },
        { text: t("footer.portal"), url: portalTo },
        { text: t("footer.signin"), url: primaryTo },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { text: t("footer.about"), url: "/coming-soon" },
        { text: t("footer.contact"), url: "mailto:hola@clinika.health" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { text: t("footer.help"), url: "mailto:hola@clinika.health" },
        { text: t("footer.privacy"), url: "/coming-soon" },
      ],
    },
    {
      title: t("footer.social"),
      links: [
        { text: "Instagram", url: "/coming-soon" },
        { text: "LinkedIn", url: "/coming-soon" },
        { text: "X", url: "/coming-soon" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold text-slate-900">Clinika</span>
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
        {/* Diagonal teal light beams (adapted from the hero-section-9 backdrop) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-[1] hidden opacity-70 contain-strict lg:block"
        >
          <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(20,184,166,0.10)_0,rgba(13,148,136,0.03)_50%,transparent_80%)]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(45,212,191,0.07)_0,rgba(13,148,136,0.02)_80%,transparent_100%)] [translate:5%_-50%]" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pt-20 pb-20 lg:grid-cols-2 lg:gap-8 lg:pt-28">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <h1
              className="animate-fade-up text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl"
              style={{ animationDelay: ".12s" }}
            >
              {t("app.heroTitle")}{" "}
              <span className="text-brand-600">{t("app.heroTitleEm")}</span>.
            </h1>
            <p
              className="animate-fade-up mx-auto mt-5 max-w-xl text-lg text-slate-500 lg:mx-0"
              style={{ animationDelay: ".2s" }}
            >
              {t("app.heroSub")}
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
              style={{ animationDelay: ".28s" }}
            >
              <Link to={primaryTo} className="btn-primary px-6 py-3 text-base">
                {t("app.getStarted")} <ArrowRight size={18} />
              </Link>
              <LiquidButton as={Link} to={profileTo} size="xl" className="text-brand-800">
                {secondaryLabel}
              </LiquidButton>
            </div>
          </div>

          {/* Right: angled product preview, off to the side for depth/style
              (flat and centered on small screens, tilted from lg up). */}
          <div
            className="animate-fade-up [perspective:2200px]"
            style={{ animationDelay: ".34s" }}
          >
            <div className="origin-center transition-transform duration-500 lg:[transform:rotateY(-22deg)_rotateX(6deg)_rotate(-1deg)] lg:scale-110">
              <AppPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features — compact animated reveal */}
      <div id="features">
        <HeroScroll
          title={t("app.featuresTitle")}
          subtitle={t("app.featuresSub")}
          features={features}
          ctaTo={primaryTo}
          ctaLabel={t("app.getStarted")}
        />
      </div>

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

      <Footer2
        logo={{ url: "/", title: "Clinika" }}
        tagline={t("footer.tagline")}
        menuItems={footerMenu}
        copyright={`© ${new Date().getFullYear()} Clinika. ${t("footer.rights")}`}
        bottomLinks={[
          { text: t("footer.terms"), url: "/coming-soon" },
          { text: t("footer.privacy"), url: "/coming-soon" },
        ]}
      />
    </div>
  );
}
