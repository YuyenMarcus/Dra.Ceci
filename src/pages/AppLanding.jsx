import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import { LiquidButton } from "../components/ui/liquid-glass-button.jsx";
import AppPreview from "../components/ui/app-preview.jsx";
import HeroScroll from "../components/ui/hero-scroll-animation.jsx";
import { Footer2 } from "../components/ui/footer2.jsx";
import Reveal from "../components/ui/reveal.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
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
  Check,
  ChevronDown,
  UserPlus,
  Link2,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { PLANS, planFeatures } from "../lib/plans.js";
import { useSeo } from "../lib/seo.js";

export default function AppLanding() {
  const { t, lang } = useLang();
  const { isDoctor, isClient, canAccessPatientPortal, clinic } = useAuth();

  useSeo({
    title: t("seo.landingTitle"),
    description: t("seo.landingDesc"),
    path: "/",
    jsonLd: {
      faq: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [1, 2, 3, 4].map((i) => ({
          "@type": "Question",
          name: t(`faq.q${i}`),
          acceptedAnswer: { "@type": "Answer", text: t(`faq.a${i}`) },
        })),
      },
    },
  });

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
        { text: t("app.navPricing"), url: "#pricing" },
        { text: t("footer.booking"), url: "/find" },
        { text: t("footer.portal"), url: portalTo },
        { text: t("footer.signin"), url: primaryTo },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { text: t("footer.about"), url: "/about" },
        { text: t("footer.contact"), url: "mailto:team@clinika.health" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { text: t("footer.help"), url: "/help" },
        { text: t("footer.privacy"), url: "/privacy" },
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
              <span className="brand-text text-lg">Clinika</span>
              <span className="text-[11px] font-medium text-slate-400">
                {t("app.tagline")}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" />
            <a href="#pricing" className="btn-ghost hidden md:inline-flex">
              {t("app.navPricing")}
            </a>
            <Link to={profileTo} className="btn-ghost hidden sm:inline-flex">
              {t("app.navProfile")}
            </Link>
            <Link to={primaryTo} className="btn-primary shrink-0">
              {isClient ? t("app.goToPortal") : t("app.login")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 transform-gpu rounded-full bg-brand-200/40 blur-3xl" />
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
            <p
              className="animate-fade-up mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-400 lg:justify-start"
              style={{ animationDelay: ".34s" }}
            >
              <Check size={15} className="text-brand-500" /> {t("app.heroNote")}
            </p>
          </div>

          {/* Right: angled product preview, off to the side for depth/style
              (flat and centered on small screens, tilted from lg up). */}
          <div
            className="animate-fade-up [perspective:2200px]"
            style={{ animationDelay: ".34s" }}
          >
            <div className="origin-center transform-gpu lg:[transform:rotateY(-22deg)_rotateX(6deg)_rotate(-1deg)] lg:scale-110">
              {/* Float inside the tilt so the drift follows the panel's own
                  (rotated) axis — reads as hovering in 3D, not sliding. */}
              <div className="animate-float">
                <AppPreview />
              </div>
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

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {t("how.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-500">{t("how.sub")}</p>
        </Reveal>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
          {/* Connector line (desktop) with a pulse traveling step 1 → 3 */}
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-brand-200 sm:block"
          >
            <div className="absolute -top-1 left-0 right-0 h-2 overflow-hidden rounded-full">
              <div className="line-sweep" />
            </div>
          </div>
          {[
            { icon: UserPlus, title: t("how.1.title"), desc: t("how.1.desc") },
            { icon: Link2, title: t("how.2.title"), desc: t("how.2.desc") },
            { icon: CalendarCheck2, title: t("how.3.title"), desc: t("how.3.desc") },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 120} className="relative text-center">
              <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-8px_rgba(13,148,136,0.25)] ring-1 ring-brand-100">
                <Icon size={24} />
              </div>
              <span className="mt-4 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
                {i + 1}
              </span>
              <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
                {desc}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Shareable profile highlight */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="card grid items-center gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-2">
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{sampleName}</p>
                  <p className="truncate text-xs text-slate-400">{sampleUrl}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {t("landing.bookAppointment")}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Globe2 size={14} className="text-brand-500" />
                {t("app.feat.bookingDesc")}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-slate-200/70 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("pricing.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-slate-500">{t("pricing.sub")}</p>
          </Reveal>
          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((p, i) => {
              const feats = planFeatures(p.id, lang);
              // Show 6 features by default; Hacienda-Ready shows its full 7 so
              // nothing is hidden behind "+N more".
              const cap = p.id === "hacienda" ? 7 : 6;
              const shown = feats.slice(0, cap);
              const extra = feats.length - shown.length;
              return (
                <Reveal
                  key={p.id}
                  delay={i * 120}
                  className={`relative flex flex-col rounded-2xl p-7 ${
                    p.highlight
                      ? "bg-gradient-to-b from-brand-700 to-brand-900 text-white shadow-[0_20px_50px_-20px_rgba(13,148,136,0.5)] lg:-my-3 lg:py-10"
                      : "border border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  {p.comingSoon ? (
                    <span
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        p.highlight
                          ? "bg-brand-400 text-brand-950"
                          : "bg-slate-900 text-white"
                      }`}
                    >
                      {t("plan.comingSoon")}
                    </span>
                  ) : p.highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-950">
                      {t("plan.popular")}
                    </span>
                  ) : null}
                  <h3
                    className={`font-semibold ${
                      p.highlight ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {p.name}
                  </h3>
                  <p className="mt-2.5">
                    <span
                      className={`text-4xl font-extrabold tracking-tight ${
                        p.highlight ? "text-white" : "text-slate-900"
                      }`}
                    >
                      ${p.price}
                    </span>
                    <span
                      className={`text-sm ${
                        p.highlight ? "text-brand-200" : "text-slate-400"
                      }`}
                    >
                      {t("plan.perMonth")}
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {shown.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          size={15}
                          className={`mt-0.5 shrink-0 ${
                            p.highlight ? "text-brand-300" : "text-brand-500"
                          }`}
                        />
                        <span className={p.highlight ? "text-brand-50" : "text-slate-600"}>
                          {f}
                        </span>
                      </li>
                    ))}
                    {extra > 0 && (
                      <li
                        className={`pl-[26px] text-xs font-medium ${
                          p.highlight ? "text-brand-200" : "text-slate-400"
                        }`}
                      >
                        {t("pricing.moreFeatures", { n: extra })}
                      </li>
                    )}
                  </ul>
                  {p.comingSoon ? (
                    <span
                      className={`btn mt-7 w-full cursor-default px-5 py-3 ${
                        p.highlight
                          ? "border border-white/25 bg-white/10 text-brand-100"
                          : "border border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {t("plan.comingSoon")}
                    </span>
                  ) : (
                    <Link
                      to={isDoctor ? "/app/settings" : "/signup"}
                      className={`btn mt-7 w-full px-5 py-3 ${
                        p.highlight
                          ? "bg-white text-brand-800 hover:bg-brand-50"
                          : "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                      }`}
                    >
                      {t("pricing.cta")} <ArrowRight size={16} />
                    </Link>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {t("faq.title")}
          </h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {[1, 2, 3, 4].map((n, i) => (
            <Reveal
              as="details"
              key={n}
              delay={i * 90}
              className="group rounded-2xl border border-slate-200 bg-white px-6 py-1 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {t(`faq.q${n}`)}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-slate-500">
                {t(`faq.a${n}`)}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-8 py-14 text-center text-white sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:44px_44px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 transform-gpu rounded-full bg-brand-400/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-brand-100/90">{t("cta.sub")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={primaryTo}
                className="btn bg-white px-7 py-3.5 text-base text-brand-800 hover:bg-brand-50"
              >
                {t("app.getStarted")} <ArrowRight size={18} />
              </Link>
              <a
                href="#pricing"
                className="btn bg-white/10 px-7 py-3.5 text-base text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
              >
                {t("app.navPricing")}
              </a>
            </div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-brand-200">
              <Check size={15} /> {t("app.heroNote")}
            </p>
          </div>
        </Reveal>
      </section>

      <Footer2
        logo={{ url: "/", title: "Clinika" }}
        tagline={t("footer.tagline")}
        menuItems={footerMenu}
        copyright={`© ${new Date().getFullYear()} Nitron Digital LLC · Clinika. ${t("footer.rights")}`}
        bottomLinks={[
          { text: t("footer.terms"), url: "/terms" },
          { text: t("footer.privacy"), url: "/privacy" },
        ]}
      />
    </div>
  );
}
