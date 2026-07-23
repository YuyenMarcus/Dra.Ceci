import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Boxes,
  Users,
  CalendarDays,
  Bell,
  Sparkles,
  Stethoscope,
  Smile,
} from "lucide-react";
import BrandMark from "../BrandMark.jsx";
import { useLang } from "../../i18n/LanguageContext.jsx";
import { formatLongDate } from "../../lib/format.js";

/**
 * AppPreview — a lightweight, on-brand mock of the Clinika dashboard used as
 * the hero "product shot". Built from divs (no external screenshot) so it
 * stays crisp at any size and never 404s. Content is real (translated) text
 * so it reads as a living product, not a loading skeleton.
 */
export default function AppPreview() {
  const { t } = useLang();

  // Some ad-block / content-filter extensions inject `display:none !important`
  // on sidebar-like elements (this hid the real portal sidebar in some Chrome
  // setups too). A stylesheet rule can't beat an extension's author-origin
  // !important, but an INLINE !important does. Drive it from a media query so
  // the mock sidebar still only shows from the `sm` breakpoint up.
  const sidebarRef = useRef(null);
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return undefined;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      el.style.setProperty("display", mq.matches ? "flex" : "none", "important");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const nav = [
    { Icon: LayoutDashboard, label: t("nav.dashboard") },
    { Icon: Boxes, label: t("nav.inventory") },
    { Icon: Users, label: t("nav.clients") },
    { Icon: CalendarDays, label: t("nav.appointments") },
  ];

  const stats = [
    {
      v: "8",
      label: t("preview.apptsToday"),
      Icon: CalendarDays,
      tone: "bg-brand-50 text-brand-600",
    },
    {
      v: "1.2k",
      label: t("dash.myClients"),
      Icon: Users,
      tone: "bg-portal-100 text-portal-600",
    },
    {
      v: "3",
      label: t("dash.lowOut"),
      Icon: Boxes,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  const agenda = [
    {
      reason: t("reason.cleaning"),
      tag: t("preview.confirmed"),
      time: "09:30",
      Icon: Sparkles,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      reason: t("reason.checkup"),
      tag: t("common.online"),
      time: "10:15",
      Icon: Stethoscope,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      reason: t("reason.whitening"),
      tag: t("preview.firstVisit"),
      time: "11:00",
      Icon: Smile,
      tone: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-900/10 ring-1 ring-black/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="mx-auto flex h-5 w-64 max-w-[45%] items-center justify-center rounded-md border border-slate-200 bg-white">
          <span className="truncate px-2 text-[10px] text-slate-400">
            clinika.health/app
          </span>
        </div>
      </div>

      <div className="flex min-h-[19rem]">
        {/* Sidebar — a <div>, not <aside>: ad-block/content filters sometimes
            target `aside`/nav-like tags and hide the whole panel in Chrome. */}
        <div
          ref={sidebarRef}
          className="hidden w-48 shrink-0 flex-col bg-gradient-to-b from-brand-800 to-brand-900 p-4 sm:flex"
        >
          <div className="mb-6 flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-sm font-bold text-white">Clinika</span>
          </div>
          <nav className="flex flex-col gap-1.5">
            {nav.map(({ Icon, label }, i) => (
              <div
                key={label}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                  i === 0 ? "bg-white/10" : ""
                }`}
              >
                <Icon
                  size={16}
                  className={i === 0 ? "text-white" : "text-brand-200/70"}
                />
                <span
                  className={`text-xs font-medium ${
                    i === 0 ? "text-white" : "text-brand-200/70"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Main */}
        <main className="flex-1 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {t("preview.greeting")}
              </p>
              <p className="text-[11px] text-slate-400 first-letter:uppercase">
                {formatLongDate()}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Bell size={15} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div
                  className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}
                >
                  <s.Icon size={15} />
                </div>
                <div className="text-lg font-bold text-slate-800">{s.v}</div>
                <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">
                {t("dash.todaysSchedule")}
              </span>
              <span className="text-[10px] font-medium text-brand-600">
                {t("dash.viewAll")}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {agenda.map((a) => (
                <div key={a.time} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.tone}`}
                  >
                    <a.Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {a.reason}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {a.tag}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {a.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
