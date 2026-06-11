import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import {
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Navigation,
  Clock,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Brush,
  Sun,
  Activity,
  Smile,
  ClipboardCheck,
  Link2,
  Check,
  Pencil,
  Flag,
  Building2,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { getServiceIcon } from "../components/serviceIcons.jsx";
import { getClinicBySlug, getClinicLocations, reportClinic } from "../store/db.js";
import LanguageToggle from "../components/LanguageToggle.jsx";
import Modal from "../components/Modal.jsx";
import ClinicMap from "../components/ClinicMap.jsx";
import Reveal from "../components/ui/reveal.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
import { formatPhoneIntl } from "../lib/format.js";
import { useSeo, SITE_URL } from "../lib/seo.js";

const REPORT_REASONS = [
  "report.reason.fake",
  "report.reason.inappropriate",
  "report.reason.wrongInfo",
  "report.reason.impersonation",
  "report.reason.notDentist",
  "report.reason.other",
];

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
const STOCK = {
  hero: U("1770321119162-05c18fbcfdb9"),
  doctor: U("1758205307960-4a0ec7ad2c0e"),
  reception: U("1777443726993-8f9c8e96e46e"),
  treatment: U("1758205308179-4e00e0e4060b"),
  equipment: U("1770321119162-05c18fbcfdb9"),
};

function ImageSlot({ src, alt = "", label, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt || label}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full rounded-2xl object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/70 text-slate-400 ${className}`}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <ImageIcon size={26} />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}

function ServiceCard({ icon: Icon, name, children }) {
  return (
    <div className="card group h-full p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_16px_36px_-14px_rgba(13,148,136,0.3)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100 transition duration-300 group-hover:from-brand-600 group-hover:to-brand-700 group-hover:text-white">
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-slate-900">{name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{children}</p>
    </div>
  );
}

export default function Profile() {
  const { slug } = useParams();
  const { t } = useLang();
  const { clinic: authClinic, isDoctor, logout } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Abuse-report modal state.
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportContact, setReportContact] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportDone, setReportDone] = useState(false);

  async function submitReport(e) {
    e.preventDefault();
    if (!reportReason) {
      setReportError("err.reportReason");
      return;
    }
    setReportBusy(true);
    setReportError("");
    const res = await reportClinic({
      clinicId: clinic.id,
      reason: t(reportReason),
      details: reportDetails,
      contact: reportContact,
    });
    setReportBusy(false);
    if (!res?.ok) {
      setReportError(res?.error || "err.reportFailed");
      return;
    }
    setReportDone(true);
  }

  function closeReport() {
    setReportOpen(false);
    // Reset after the close transition so the form is fresh next time.
    setTimeout(() => {
      setReportReason("");
      setReportDetails("");
      setReportContact("");
      setReportError("");
      setReportDone(false);
    }, 200);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getClinicBySlug(slug)
      .then((c) => {
        if (active) setClinic(c);
      })
      .catch((err) => console.error("Could not load profile:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // Load this clinic's branches once we know its id. Multi-location clinics
  // list every branch here (single directory entry, one profile page).
  useEffect(() => {
    if (!clinic?.id) return;
    let active = true;
    getClinicLocations(clinic.id)
      .then((locs) => active && setBranches(locs))
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [clinic?.id]);

  const profileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : `/c/${slug}`;
  const isOwner = isDoctor && authClinic?.slug === slug;
  // A dropped pin (exact coords) takes priority over the free-text map query.
  const coords =
    Number.isFinite(clinic?.profile?.lat) && Number.isFinite(clinic?.profile?.lng)
      ? { lat: clinic.profile.lat, lng: clinic.profile.lng }
      : null;
  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : clinic?.mapQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.mapQuery)}`
      : null;

  // SEO: dynamic title/description + Dentist structured data for the clinic.
  // Must run unconditionally (before the loading/404 early returns below).
  useSeo({
    title: clinic?.name ? t("seo.profileTitle", { name: clinic.name }) : undefined,
    description: clinic?.name
      ? clinic.profile?.tagline?.trim() || t("seo.profileDesc", { name: clinic.name })
      : undefined,
    path: `/c/${slug}`,
    type: "profile",
    image: clinic?.profile?.images?.hero || undefined,
    noindex: !loading && !clinic,
    jsonLd: clinic?.name
      ? {
          dentist: {
            "@context": "https://schema.org",
            "@type": "Dentist",
            name: clinic.name,
            url: `${SITE_URL}/c/${slug}`,
            ...(clinic.phone ? { telephone: clinic.phone } : {}),
            ...(clinic.address || clinic.city
              ? {
                  address: {
                    "@type": "PostalAddress",
                    ...(clinic.address ? { streetAddress: clinic.address } : {}),
                    ...(clinic.city ? { addressLocality: clinic.city } : {}),
                  },
                }
              : {}),
            ...(coords
              ? {
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: coords.lat,
                    longitude: coords.lng,
                  },
                }
              : {}),
            ...(clinic.specialty ? { medicalSpecialty: clinic.specialty } : {}),
            potentialAction: {
              "@type": "ReserveAction",
              target: `${SITE_URL}/c/${slug}/book`,
            },
          },
        }
      : null,
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const defaultServices = [
    { icon: Sparkles, name: t("landing.svc.cleaning"), desc: t("landing.svc.cleaningDesc") },
    { icon: Brush, name: t("landing.svc.fillings"), desc: t("landing.svc.fillingsDesc") },
    { icon: Sun, name: t("landing.svc.whitening"), desc: t("landing.svc.whiteningDesc") },
    { icon: Activity, name: t("landing.svc.endo"), desc: t("landing.svc.endoDesc") },
    { icon: Smile, name: t("landing.svc.ortho"), desc: t("landing.svc.orthoDesc") },
    { icon: ClipboardCheck, name: t("landing.svc.checkup"), desc: t("landing.svc.checkupDesc") },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Stethoscope size={26} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">404</h1>
        <p className="max-w-sm text-slate-500">
          {t("common.unknown")} — <span className="font-mono">/c/{slug}</span>
        </p>
        <Link to="/" className="btn-primary">
          Clinika
        </Link>
      </div>
    );
  }

  const clinicName = clinic.name || "Clinika";

  // Editable content with sensible fallbacks to the translated defaults.
  const cp = clinic.profile || {};
  const img = cp.images || {};
  const heroImg = img.hero || STOCK.hero;
  const doctorImg = img.doctor || STOCK.doctor;
  const receptionImg = img.reception || STOCK.reception;
  const treatmentImg = img.treatment || STOCK.treatment;
  const equipmentImg = img.equipment || STOCK.equipment;
  const tagline = cp.tagline?.trim() || t("landing.heroSubClinic");
  const bio = cp.bio?.trim() || t("landing.draBio");
  const highlights =
    Array.isArray(cp.highlights) && cp.highlights.length
      ? cp.highlights
      : [t("landing.draPoint1"), t("landing.draPoint2"), t("landing.draPoint3")];
  const hoursValue = cp.hours?.trim() || t("landing.hoursValue");
  const serviceList =
    Array.isArray(cp.services) && cp.services.length
      ? cp.services.map((s) => ({ icon: getServiceIcon(s.icon), name: s.name, desc: s.desc }))
      : defaultServices;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Owner share bar */}
      {isOwner && (
        <div className="bg-brand-700 text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles size={15} /> {t("profile.youBadge")} ·{" "}
              <span className="text-brand-100">{t("profile.shareHint")}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyLink}
                className="btn bg-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/25"
              >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? t("profile.copied") : t("profile.copyLink")}
              </button>
              <Link
                to="/app/profile"
                className="btn bg-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/25"
              >
                <Pencil size={14} /> {t("profile.editProfile")}
              </Link>
              <Link
                to="/app"
                className="btn bg-white px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50"
              >
                <LayoutDashboard size={14} /> {t("profile.backToApp")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link to={`/c/${slug}`} className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={36} />
            <span className="truncate text-lg font-bold text-slate-900">{clinicName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 sm:inline-flex sm:mr-1" />
            <Link to={`/c/${slug}/manage`} className="btn-ghost hidden sm:inline-flex">
              {t("landing.manageBooking")}
            </Link>
            <Link to={`/c/${slug}/book`} className="btn-primary">
              {t("landing.bookAppointment")}
            </Link>
            {isOwner ? (
              <button
                onClick={logout}
                className="btn-ghost hidden sm:inline-flex"
                title={t("layout.signOut")}
              >
                <LogOut size={16} /> {t("layout.signOut")}
              </button>
            ) : (
              <Link to="/login" className="btn-outline hidden sm:inline-flex">
                {t("landing.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 transform-gpu rounded-full bg-brand-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-12 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles size={14} /> {cp.kicker?.trim() || t("landing.heroKicker")}
            </span>
            <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {cp.headline?.trim() ? (
                cp.headline
              ) : (
                <>
                  {t("landing.heroHeadlineClinic")}{" "}
                  <span className="text-brand-600">{t("landing.heroHeadlineEm")}</span>.
                </>
              )}
            </h1>
            <p className="animate-fade-up mt-5 max-w-xl text-lg text-slate-500">
              {tagline}
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={`/c/${slug}/book`} className="btn-primary px-6 py-3 text-base">
                {t("landing.bookCta")} <ArrowRight size={18} />
              </Link>
              <a href="#services" className="btn-outline px-6 py-3 text-base">
                {t("landing.ourServices")}
              </a>
            </div>
            {clinic.phone && (
              <p className="animate-fade-up mt-5 flex items-center gap-2 text-sm text-slate-500">
                <Phone size={15} className="text-brand-600" /> {t("landing.callUs")}:{" "}
                <span className="font-medium text-slate-700">{formatPhoneIntl(clinic.phone)}</span>
              </p>
            )}
          </div>
          {/* Layered photo with a floating hours chip */}
          <div className="animate-fade-up relative">
            <div
              aria-hidden
              className="absolute -inset-3 rotate-2 transform-gpu rounded-3xl bg-gradient-to-br from-brand-100 to-brand-50 ring-1 ring-brand-100"
            />
            <ImageSlot
              src={heroImg}
              label={t("landing.heroImage")}
              className="relative aspect-[4/3] w-full shadow-xl"
            />
            <div className="absolute -bottom-5 left-5 flex max-w-[85%] items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-slate-900/5 backdrop-blur">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Clock size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("landing.hours")}
                </p>
                <p className="truncate text-xs font-semibold text-slate-800">{hoursValue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* At-a-glance strip */}
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-6">
          <div className="card grid gap-5 p-6 sm:grid-cols-3 sm:gap-2 sm:divide-x sm:divide-slate-100 sm:p-2">
            {[
              {
                icon: MapPin,
                label: t("landing.address"),
                value: [clinic.address, clinic.city].filter(Boolean).join(", ") || clinic.clinic,
              },
              { icon: Clock, label: t("landing.hours"), value: hoursValue },
              clinic.phone && { icon: Phone, label: t("landing.phone"), value: formatPhoneIntl(clinic.phone) },
            ]
              .filter(Boolean)
              .map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 sm:px-5 sm:py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="truncate text-sm font-medium text-slate-700">{value}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Meet the dentist */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 -rotate-2 transform-gpu rounded-3xl bg-brand-50 ring-1 ring-brand-100"
            />
            <ImageSlot
              src={doctorImg}
              label={clinicName}
              className="relative aspect-[4/5] max-h-[30rem] w-full shadow-lg"
            />
          </Reveal>
          <Reveal delay={120}>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Stethoscope size={14} /> {cp.professionLabel?.trim() || t("landing.yourDentist")}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">{clinicName}</h2>
            {clinic.specialty && (
              <p className="mt-1 text-sm font-medium text-brand-600">{clinic.specialty}</p>
            )}
            <p className="mt-3 text-slate-500">{bio}</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              {highlights.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-500" />
                  {point}
                </li>
              ))}
            </ul>
            <Link to={`/c/${slug}/book`} className="btn-primary mt-7 px-6 py-3 text-base">
              {t("landing.bookWithDra")} <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-24 border-y border-slate-200/70 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("landing.servicesTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">{t("landing.servicesSub")}</p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {serviceList.map((s, i) => (
              <Reveal key={s.name} delay={(i % 3) * 90}>
                <ServiceCard icon={s.icon} name={s.name}>
                  {s.desc}
                </ServiceCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("landing.galleryTitle")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{t("landing.gallerySub")}</p>
        </Reveal>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { src: receptionImg, label: t("landing.reception") },
            { src: treatmentImg, label: t("landing.treatmentRoom") },
            { src: equipmentImg, label: t("landing.equipment") },
          ].map(({ src, label }, i) => (
            <Reveal key={label} delay={i * 90} className="group overflow-hidden rounded-2xl">
              <ImageSlot
                src={src}
                label={label}
                className="aspect-[4/3] transition-transform duration-500 group-hover:scale-105"
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("landing.locationTitle")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{t("landing.locationSub")}</p>
        </Reveal>
        <Reveal className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="card flex flex-col gap-5 p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("landing.address")}</p>
                <p className="font-semibold text-slate-900">{clinic.clinic}</p>
                <p className="text-sm text-slate-500">{clinic.address}</p>
                <p className="text-sm text-slate-500">{clinic.city}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("landing.hours")}</p>
                <p className="text-sm text-slate-600">{hoursValue}</p>
              </div>
            </div>
            {clinic.phone && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("landing.phone")}</p>
                  <p className="text-sm text-slate-600">{formatPhoneIntl(clinic.phone)}</p>
                </div>
              </div>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-primary mt-1 self-start">
                <Navigation size={16} /> {t("landing.getDirections")}
              </a>
            )}
          </div>

          {coords ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-slate-200"
            >
              <ClinicMap
                lat={coords.lat}
                lng={coords.lng}
                className="pointer-events-none h-full min-h-[18rem] w-full"
              />
              <span className="absolute bottom-3 right-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <MapPin size={13} /> {t("landing.getDirections")}
              </span>
            </a>
          ) : mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-slate-200"
            >
              <iframe
                title={t("landing.mapPlaceholder")}
                className="pointer-events-none h-full min-h-[18rem] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(clinic.mapQuery)}&output=embed`}
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <MapPin size={13} /> {t("landing.getDirections")}
              </span>
            </a>
          ) : (
            <ImageSlot label={t("landing.mapPlaceholder")} className="min-h-[18rem]" />
          )}
        </Reveal>
      </section>

      {/* Branches (multi-location clinics) */}
      {branches.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-14">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("landing.branchesTitle")}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              {t("landing.branchesSub")}
            </p>
          </Reveal>
          <Reveal className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => {
              const addr = [b.address, b.city].filter(Boolean).join(", ");
              const bMapUrl =
                Number.isFinite(b.lat) && Number.isFinite(b.lng)
                  ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
                  : b.mapQuery || addr
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.mapQuery || addr)}`
                    : null;
              return (
                <div key={b.id} className="card flex flex-col gap-3 p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Building2 size={19} />
                    </span>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                  </div>
                  {addr && (
                    <p className="flex items-start gap-2 text-sm text-slate-500">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /> {addr}
                    </p>
                  )}
                  {b.hours && (
                    <p className="flex items-start gap-2 text-sm text-slate-500">
                      <Clock size={15} className="mt-0.5 shrink-0 text-slate-400" /> {b.hours}
                    </p>
                  )}
                  {b.phone && (
                    <p className="flex items-start gap-2 text-sm text-slate-500">
                      <Phone size={15} className="mt-0.5 shrink-0 text-slate-400" />
                      {formatPhoneIntl(b.phone)}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {bMapUrl && (
                      <a
                        href={bMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline px-3 py-1.5 text-sm"
                      >
                        <Navigation size={14} /> {t("landing.getDirections")}
                      </a>
                    )}
                    <Link to={`/c/${slug}/book`} className="btn-ghost px-3 py-1.5 text-sm">
                      <ArrowRight size={14} /> {t("landing.bookHere")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-8 py-14 text-center text-white sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 transform-gpu rounded-full bg-brand-400/25 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-5">
            <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              {t("landing.ctaTitle")}
            </h2>
            <p className="max-w-md text-brand-100">{t("landing.ctaSub")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/c/${slug}/book`}
                className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50"
              >
                {t("landing.bookAppointment")} <ArrowRight size={18} />
              </Link>
              <Link
                to={`/c/${slug}/manage`}
                className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10"
              >
                {t("landing.manageBooking")}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-400 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {clinicName} · {t("landing.footerNote")}
          </span>
          <div className="flex items-center gap-4">
            {!isOwner && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-400 transition hover:text-rose-600"
              >
                <Flag size={14} /> {t("report.cta")}
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-brand-600"
            >
              {t("landing.poweredBy")} <BrandMark size={18} rounded="rounded-md" />
              <span className="font-semibold">Clinika</span>
            </Link>
          </div>
        </div>
      </footer>

      <Modal
        open={reportOpen}
        onClose={closeReport}
        title={t("report.title")}
        size="md"
      >
        {reportDone ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-semibold text-slate-900">{t("report.thanksTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("report.thanksBody")}</p>
            <button onClick={closeReport} className="btn-primary mt-6">
              {t("common.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={submitReport} className="space-y-4">
            <p className="text-sm text-slate-500">{t("report.intro", { name: clinicName })}</p>
            <div>
              <label className="label">{t("report.reasonLabel")}</label>
              <select
                className="input"
                value={reportReason}
                onChange={(e) => {
                  setReportReason(e.target.value);
                  setReportError("");
                }}
              >
                <option value="" disabled>
                  {t("common.select")}
                </option>
                {REPORT_REASONS.map((key) => (
                  <option key={key} value={key}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("report.detailsLabel")}</label>
              <textarea
                className="input min-h-[90px] resize-y"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder={t("report.detailsPh")}
                maxLength={1000}
              />
            </div>
            <div>
              <label className="label">{t("report.contactLabel")}</label>
              <input
                className="input"
                value={reportContact}
                onChange={(e) => setReportContact(e.target.value)}
                placeholder={t("report.contactPh")}
                maxLength={200}
              />
            </div>
            {reportError && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                {t(reportError)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeReport} className="btn-ghost">
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={reportBusy} className="btn-danger disabled:opacity-60">
                <Flag size={16} /> {t("report.submit")}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
