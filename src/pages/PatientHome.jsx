import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import {
  Stethoscope,
  Mail,
  Phone,
  CalendarClock,
  CalendarPlus,
  LogOut,
  Home,
  ArrowRight,
  MapPin,
  CalendarX,
  Users,
  LayoutDashboard,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import {
  loadPatientPortal,
  linkPatientRecords,
  getMyTreatments,
  getMyConsents,
  logEvent,
} from "../store/db.js";
import {
  formatLongDate,
  formatDateTime,
  formatTime,
  relativeDay,
} from "../lib/format.js";
import { funGreeting } from "../lib/funGreeting.js";
import LanguageToggle from "../components/LanguageToggle.jsx";
import TreatmentTimeline from "../components/TreatmentTimeline.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";

export default function PatientHome() {
  const { t, lang } = useLang();
  useSeo({ title: `${t("app.patientPortal")} | Clinika`, noindex: true });
  const { patient, logout, canSwitchRoles } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = patient?.name?.split(" ")[0] || "";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        if (patient?.phone) await linkPatientRecords(patient.phone);
        const [data, tx, cs] = await Promise.all([
          loadPatientPortal(patient?.id),
          getMyTreatments(),
          getMyConsents(),
        ]);
        if (!active) return;
        setDoctors(data.doctors);
        setAppointments(data.appointments);
        setTreatments(tx);
        setConsents(cs);
        // Record a portal login once per browser session (engagement metric).
        const key = `medtrack.portalLogged.${patient?.id}`;
        if (patient?.id && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          logEvent("portal.login");
        }
      } catch (err) {
        console.error("Could not load patient portal:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patient?.id, patient?.phone]);

  const doctorById = useMemo(() => {
    const map = {};
    doctors.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [doctors]);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.status === "scheduled" &&
            new Date(a.start).getTime() >= Date.now()
        )
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [appointments]
  );

  const cancelled = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "cancelled")
        .sort((a, b) => new Date(b.start) - new Date(a.start)),
    [appointments]
  );

  const nextAppt = upcoming[0];
  const primaryDoctor = doctors[0];

  const funLine = useMemo(
    () => funGreeting(lang, firstName, patient?.id),
    [lang, firstName, patient?.id]
  );

  const doctorName = (id) => doctorById[id]?.name;

  return (
    <div className="portal-scope min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="text-lg font-bold text-slate-900">Clinika</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" />
            {canSwitchRoles && (
              <Link
                to="/app"
                className="btn-ghost text-brand-700 hover:bg-brand-50"
                title={t("patient.switchToDoctor")}
              >
                <LayoutDashboard size={16} /> {t("patient.doctorDashboard")}
              </Link>
            )}
            <Link to="/" className="btn-ghost">
              <Home size={16} /> {t("patient.backHome")}
            </Link>
            <button onClick={logout} className="btn-outline" title={t("layout.signOut")}>
              <LogOut size={16} /> {t("layout.signOut")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {/* Greeting hero */}
        <section className="card animate-fade-up overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-portal-700 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium capitalize text-brand-100">
                {formatLongDate()}
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
                {funLine}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-brand-100">
                <CalendarClock size={16} />
                {nextAppt
                  ? t("patient.nextSummary", {
                      when: `${relativeDay(nextAppt.start)}, ${formatTime(nextAppt.start)}`,
                    })
                  : t("patient.noUpcoming")}
              </p>
            </div>
            {primaryDoctor && (
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to={`/c/${primaryDoctor.slug}/book`}
                  className="btn bg-white px-4 py-2.5 text-brand-700 hover:bg-brand-50"
                >
                  <CalendarPlus size={16} /> {t("patient.bookNew")}
                </Link>
                <Link
                  to={`/c/${primaryDoctor.slug}/manage`}
                  className="btn bg-white/15 px-4 py-2.5 text-white hover:bg-white/25"
                >
                  {t("landing.manageBooking")}
                </Link>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Your details */}
          <div className="card animate-fade-up p-7" style={{ animationDelay: ".05s" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-portal-600 text-lg font-bold text-white">
                {firstName.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("landing.yourDetails")}
                </p>
                <p className="text-lg font-bold text-slate-900">{patient?.name}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {patient?.email && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail size={16} className="shrink-0 text-slate-400" />
                  {patient.email}
                </div>
              )}
              {patient?.phone && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone size={16} className="shrink-0 text-slate-400" />
                  {patient.phone}
                </div>
              )}
            </div>
          </div>

          {/* My doctors */}
          <div className="card animate-fade-up p-7 lg:col-span-2" style={{ animationDelay: ".1s" }}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Users size={14} /> {t("patient.myDoctors")}
              </p>
              {doctors.length > 0 && (
                <span className="rounded-full bg-portal-50 px-2.5 py-0.5 text-xs font-semibold text-portal-700">
                  {doctors.length}
                </span>
              )}
            </div>

            {loading ? (
              <p className="mt-5 text-sm text-slate-400">{t("common.loading")}</p>
            ) : doctors.length === 0 ? (
              <div className="mt-4 flex flex-col items-start gap-3">
                <p className="text-sm text-slate-500">{t("patient.noDoctors")}</p>
                <Link to="/find" className="btn-primary">
                  {t("patient.findDoctor")} <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {doctors.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-portal-100 text-portal-700">
                      <Stethoscope size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{d.name}</p>
                      <p className="text-sm text-slate-500">
                        {d.specialty || d.clinic}
                      </p>
                      {(d.clinic || d.address) && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin size={12} />
                          {[d.clinic, d.city].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/c/${d.slug}`} className="btn-ghost text-sm">
                        {t("app.navProfile")}
                      </Link>
                      <Link to={`/c/${d.slug}/book`} className="btn-primary text-sm">
                        <CalendarPlus size={15} /> {t("patient.bookNew")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Treatment history */}
        <div className="card animate-fade-up mt-5 p-6" style={{ animationDelay: ".12s" }}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <ClipboardList size={18} className="text-portal-600" />
            {t("patient.careHistory")}
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">{t("common.loading")}</p>
          ) : (
            <TreatmentTimeline items={treatments} showClinic />
          )}
        </div>

        {/* Consent documents */}
        {consents.length > 0 && (
          <div className="card animate-fade-up mt-5 p-6" style={{ animationDelay: ".14s" }}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <FileText size={18} className="text-portal-600" />
              {t("patient.documents")}
            </h2>
            <ul className="space-y-3">
              {consents.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {c.procedure || t("tx.consent")}
                    {c.clinicName ? ` · ${c.clinicName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.signedName} — {formatDateTime(c.signedAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-600">{c.body}</p>
                  <button
                    type="button"
                    className="btn-ghost mt-2 text-xs"
                    onClick={() => window.print()}
                  >
                    {t("patient.printDoc")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upcoming appointments */}
        <div className="card animate-fade-up mt-5" style={{ animationDelay: ".15s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <CalendarClock size={18} className="text-portal-600" />
              {t("patient.upcomingTitle")}
            </h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarClock size={22} />
              </div>
              <p className="text-sm text-slate-500">{t("patient.noUpcoming")}</p>
              {primaryDoctor && (
                <Link to={`/c/${primaryDoctor.slug}/book`} className="btn-primary mt-1">
                  {t("patient.bookNew")} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/70"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-portal-50 text-portal-700">
                    <CalendarClock size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {a.reason || t("landing.assignedDentist")}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {doctorName(a.doctorId) || a.provider}
                    </p>
                    {a.notes && (
                      <p className="truncate text-xs italic text-slate-400">“{a.notes}”</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {relativeDay(a.start)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.start)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancelled appointments */}
        {cancelled.length > 0 && (
          <div className="card animate-fade-up mt-5" style={{ animationDelay: ".2s" }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <CalendarX size={18} className="text-rose-500" />
                {t("patient.cancelledTitle")}
              </h2>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                {cancelled.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {cancelled.map((a) => {
                const d = doctorById[a.doctorId];
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <CalendarX size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium text-slate-600">
                        <span className="truncate line-through">
                          {a.reason || t("landing.assignedDentist")}
                        </span>
                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          {t("appt.cancelledTag")}
                        </span>
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {formatDateTime(a.start)}
                      </p>
                    </div>
                    {d && (
                      <Link
                        to={`/c/${d.slug}/book`}
                        className="shrink-0 text-sm font-medium text-portal-600 hover:text-portal-700"
                      >
                        {t("patient.bookAgain")}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
