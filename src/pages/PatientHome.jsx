import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  User,
  Mail,
  Phone,
  CalendarClock,
  CalendarPlus,
  LogOut,
  Home,
  CheckCircle2,
  ArrowRight,
  MapPin,
  CalendarX,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useStore } from "../store/StoreContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import {
  formatLongDate,
  formatDateTime,
  formatTime,
  relativeDay,
  normalizePhone,
} from "../lib/format.js";
import { funGreeting } from "../lib/funGreeting.js";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function PatientHome() {
  const { t, lang } = useLang();
  const { currentUser, logout } = useAuth();
  const { doctors, appointments } = useStore();

  const client = currentUser;
  const myDoctor = doctors.find((d) => d.id === client?.doctorId) || doctors[0];
  const firstName = client?.name?.split(" ")[0] || "";
  const brandName = myDoctor?.name || "MedTrack";

  const mine = (a) => {
    const byId = a.clientId && a.clientId === client?.id;
    const byPhone =
      client?.phone &&
      a.patientPhone &&
      normalizePhone(a.patientPhone) === normalizePhone(client.phone);
    return byId || byPhone;
  };

  const upcoming = appointments
    .filter(
      (a) =>
        mine(a) &&
        a.status === "scheduled" &&
        new Date(a.start).getTime() >= Date.now()
    )
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  const cancelled = appointments
    .filter((a) => mine(a) && a.status === "cancelled")
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  const nextAppt = upcoming[0];

  const funLine = useMemo(
    () => funGreeting(lang, firstName, client?.id),
    [lang, firstName, client?.id]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/dra-ceci" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Stethoscope size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">{brandName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="mr-1" />
            <Link to="/dra-ceci" className="btn-ghost">
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
        <section className="card animate-fade-up overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
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
            <div className="flex flex-wrap gap-2.5">
              <Link to="/book" className="btn bg-white px-4 py-2.5 text-brand-700 hover:bg-brand-50">
                <CalendarPlus size={16} /> {t("patient.bookNew")}
              </Link>
              <Link
                to="/manage"
                className="btn bg-white/15 px-4 py-2.5 text-white hover:bg-white/25"
              >
                {t("landing.manageBooking")}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Your details */}
          <div className="card animate-fade-up p-7" style={{ animationDelay: ".05s" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
                {firstName.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("landing.yourDetails")}
                </p>
                <p className="text-lg font-bold text-slate-900">{client?.name}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {client?.email && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail size={16} className="shrink-0 text-slate-400" />
                  {client.email}
                </div>
              )}
              {client?.phone && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone size={16} className="shrink-0 text-slate-400" />
                  {client.phone}
                </div>
              )}
            </div>
          </div>

          {/* Your dentist */}
          <div className="card animate-fade-up p-7" style={{ animationDelay: ".1s" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("landing.assignedDentist")}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-900">
              <Stethoscope size={20} className="text-brand-600" /> {myDoctor?.name}
            </p>
            {myDoctor?.specialty && (
              <p className="mt-1 text-sm text-slate-500">{myDoctor.specialty}</p>
            )}
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {[t("landing.draPoint1"), t("landing.draPoint2")].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-500" />
                  {point}
                </li>
              ))}
            </ul>
            {(myDoctor?.address || myDoctor?.clinic) && (
              <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                  {myDoctor?.clinic}
                  {myDoctor?.address ? ` · ${myDoctor.address}` : ""}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="card animate-fade-up mt-5" style={{ animationDelay: ".15s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <CalendarClock size={18} className="text-brand-600" />
              {t("patient.upcomingTitle")}
            </h2>
            <Link
              to="/book"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {t("patient.bookNew")}
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarClock size={22} />
              </div>
              <p className="text-sm text-slate-500">{t("patient.noUpcoming")}</p>
              <Link to="/book" className="btn-primary mt-1">
                {t("patient.bookNew")} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/70"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <CalendarClock size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {a.reason || t("landing.assignedDentist")}
                    </p>
                    <p className="truncate text-sm text-slate-500">{myDoctor?.name}</p>
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
              {cancelled.map((a) => (
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
                    <p className="truncate text-sm text-slate-400">{formatDateTime(a.start)}</p>
                  </div>
                  <Link
                    to="/book"
                    className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t("patient.bookAgain")}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
