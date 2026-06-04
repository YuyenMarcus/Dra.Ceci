import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { getClinicBySlug } from "../store/db.js";
import LanguageToggle from "../components/LanguageToggle.jsx";

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
    <div className="card p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
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
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const profileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : `/c/${slug}`;
  const isOwner = isDoctor && authClinic?.slug === slug;
  const mapsUrl = clinic?.mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.mapQuery)}`
    : null;

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
          MedTrack
        </Link>
      </div>
    );
  }

  const clinicName = clinic.name || "MedTrack";

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
      ? cp.services.map((s) => ({ icon: Sparkles, name: s.name, desc: s.desc }))
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Stethoscope size={18} />
            </div>
            <span className="truncate text-lg font-bold text-slate-900">{clinicName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle className="sm:mr-1" />
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
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
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
                <span className="font-medium text-slate-700">{clinic.phone}</span>
              </p>
            )}
          </div>
          <div className="animate-fade-up">
            <ImageSlot src={heroImg} label={t("landing.heroImage")} className="aspect-[4/3] w-full shadow-sm" />
          </div>
        </div>
      </section>

      {/* Meet the dentist */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ImageSlot src={doctorImg} label={clinicName} className="aspect-[4/5] max-h-[30rem] w-full" />
          <div>
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
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-24 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold text-slate-900">{t("landing.servicesTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-slate-500">{t("landing.servicesSub")}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {serviceList.map((s) => (
              <ServiceCard key={s.name} icon={s.icon} name={s.name}>
                {s.desc}
              </ServiceCard>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold text-slate-900">{t("landing.galleryTitle")}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-slate-500">{t("landing.gallerySub")}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <ImageSlot src={receptionImg} label={t("landing.reception")} className="aspect-[4/3]" />
          <ImageSlot src={treatmentImg} label={t("landing.treatmentRoom")} className="aspect-[4/3]" />
          <ImageSlot src={equipmentImg} label={t("landing.equipment")} className="aspect-[4/3]" />
        </div>
      </section>

      {/* Location */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="text-center text-2xl font-bold text-slate-900">{t("landing.locationTitle")}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-slate-500">{t("landing.locationSub")}</p>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
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
                  <p className="text-sm text-slate-600">{clinic.phone}</p>
                </div>
              </div>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-primary mt-1 self-start">
                <Navigation size={16} /> {t("landing.getDirections")}
              </a>
            )}
          </div>

          {mapsUrl ? (
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
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="card flex flex-col items-center gap-5 bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-12 text-center text-white">
          <h2 className="max-w-xl text-3xl font-bold">{t("landing.ctaTitle")}</h2>
          <p className="max-w-md text-brand-100">{t("landing.ctaSub")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={`/c/${slug}/book`} className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
              {t("landing.bookAppointment")}
            </Link>
            <Link
              to={`/c/${slug}/manage`}
              className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10"
            >
              {t("landing.manageBooking")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        {clinicName} · {t("landing.footerNote")}
      </footer>
    </div>
  );
}
