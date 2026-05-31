import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Users,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  Clock,
  CalendarPlus,
  UserPlus,
  PackagePlus,
  CalendarX,
  RotateCcw,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import {
  initials,
  avatarColor,
  formatLongDate,
  formatTime,
  formatDateTime,
  relativeDay,
} from "../lib/format.js";
import { funGreeting } from "../lib/funGreeting.js";

function StatCard({ icon: Icon, label, value, tone, to }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Link
      to={to}
      className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <ArrowRight
        size={18}
        className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
      />
    </Link>
  );
}

const sameDay = (iso) => {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
};

export default function Dashboard() {
  const { inventory, clients, appointments, updateAppointment } = useStore();
  const { currentUser } = useAuth();
  const { t, lang } = useLang();

  const myClients = useMemo(
    () => clients.filter((c) => c.doctorId === currentUser?.id),
    [clients, currentUser]
  );

  const myAppointments = useMemo(
    () => appointments.filter((a) => a.doctorId === currentUser?.id),
    [appointments, currentUser]
  );

  const lowStock = useMemo(
    () => inventory.filter((i) => Number(i.quantity) <= Number(i.reorderLevel)),
    [inventory]
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return myAppointments
      .filter((a) => a.status === "scheduled" && new Date(a.start).getTime() >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 6);
  }, [myAppointments]);

  const cancelled = useMemo(
    () =>
      myAppointments
        .filter((a) => a.status === "cancelled")
        .sort((a, b) => new Date(b.start) - new Date(a.start))
        .slice(0, 5),
    [myAppointments]
  );

  const todayCount = useMemo(
    () =>
      myAppointments.filter((a) => a.status === "scheduled" && sameDay(a.start))
        .length,
    [myAppointments]
  );

  const clientName = (a) =>
    clients.find((c) => c.id === a.clientId)?.name ??
    a.patientName ??
    t("common.unknown");

  const doctorName = currentUser?.name || t("common.doctor");
  const funLine = useMemo(
    () => funGreeting(lang, doctorName, currentUser?.id),
    [lang, doctorName, currentUser?.id]
  );
  const summary =
    todayCount === 0
      ? t("dash.noToday")
      : todayCount === 1
      ? t("dash.todayCountOne")
      : t("dash.todayCount", { count: todayCount });

  const quickActions = [
    { to: "/app/appointments", icon: CalendarPlus, label: t("appt.schedule"), solid: true },
    { to: "/app/clients", icon: UserPlus, label: t("clients.newFicha") },
    { to: "/app/inventory", icon: PackagePlus, label: t("inv.addItem") },
  ];

  return (
    <div className="space-y-6">
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
              <CalendarDays size={16} /> {summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`btn px-4 py-2.5 ${
                  a.solid
                    ? "bg-white text-brand-700 hover:bg-brand-50"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <a.icon size={16} /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label={t("dash.inventoryItems")}
          value={inventory.length}
          tone="brand"
          to="/app/inventory"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("dash.lowOut")}
          value={lowStock.length}
          tone="amber"
          to="/app/inventory"
        />
        <StatCard
          icon={Users}
          label={t("dash.myClients")}
          value={myClients.length}
          tone="sky"
          to="/app/clients"
        />
        <StatCard
          icon={CalendarDays}
          label={t("dash.upcoming")}
          value={upcoming.length}
          tone="rose"
          to="/app/appointments"
        />
      </div>

      {/* Cancelled appointments — surfaced so the doctor is immediately aware */}
      {cancelled.length > 0 && (
        <div className="card border-rose-200">
          <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/60 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-rose-700">
              <CalendarX size={18} /> {t("dash.cancelledTitle")}
            </h2>
            <Link
              to="/app/appointments"
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              {t("dash.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {cancelled.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <CalendarX size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {clientName(a)}
                  </p>
                  <p className="truncate text-sm text-slate-500 line-through">
                    {a.reason}
                  </p>
                </div>
                <p className="hidden text-sm text-slate-400 sm:block">
                  {formatDateTime(a.start)}
                </p>
                <button
                  className="btn-outline px-3 py-2 text-xs"
                  title={t("appt.restore")}
                  onClick={() => updateAppointment(a.id, { status: "scheduled" })}
                >
                  <RotateCcw size={14} /> {t("appt.restore")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">{t("dash.upcomingTitle")}</h2>
            <Link
              to="/app/appointments"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {t("dash.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                {t("dash.noUpcoming")}
              </p>
            )}
            {upcoming.map((a) => {
              const today = sameDay(a.start);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/70"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                      clientName(a)
                    )}`}
                  >
                    {initials(clientName(a))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                      {clientName(a)}
                      {today && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                          {t("dash.todayTag")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {a.reason} · {a.provider}
                    </p>
                    {a.notes && (
                      <p className="truncate text-xs italic text-slate-400">“{a.notes}”</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {today ? formatTime(a.start) : relativeDay(a.start)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.start)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">{t("dash.restockAlerts")}</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {lowStock.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStock.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                {t("dash.wellStocked")}
              </p>
            )}
            {lowStock.map((i) => {
              const out = Number(i.quantity) === 0;
              return (
                <div key={i.id} className="flex items-center gap-3 px-6 py-3.5">
                  <Clock
                    size={16}
                    className={out ? "text-rose-500" : "text-amber-500"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {i.name}
                    </p>
                    <p className="text-xs text-slate-400">{i.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      out
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {out ? t("dash.out") : `${i.quantity} ${i.unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
