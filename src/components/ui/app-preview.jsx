import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Boxes,
  Users,
  CalendarDays,
  Bell,
} from "lucide-react";
import BrandMark from "../BrandMark.jsx";

/**
 * AppPreview — a lightweight, on-brand mock of the Clinika dashboard used as
 * the hero "product shot". Built from divs (no external screenshot) so it
 * stays crisp at any size and never 404s. Text is rendered as skeleton bars
 * so the preview reads the same in any language.
 */
export default function AppPreview() {
  const navIcons = [LayoutDashboard, Boxes, Users, CalendarDays];

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

  const stats = [
    { v: "8", Icon: CalendarDays, tone: "bg-brand-50 text-brand-600" },
    { v: "1.2k", Icon: Users, tone: "bg-portal-100 text-portal-600" },
    { v: "3", Icon: Boxes, tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-900/10 ring-1 ring-black/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="mx-auto h-5 w-64 max-w-[45%] rounded-md border border-slate-200 bg-white" />
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
            {navIcons.map((Icon, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                  i === 0 ? "bg-white/10" : ""
                }`}
              >
                <Icon
                  size={16}
                  className={i === 0 ? "text-white" : "text-brand-200/70"}
                />
                <span
                  className={`h-2 rounded-full ${
                    i === 0 ? "w-16 bg-white/80" : "w-12 bg-brand-200/30"
                  }`}
                />
              </div>
            ))}
          </nav>
        </div>

        {/* Main */}
        <main className="flex-1 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-40 rounded-full bg-slate-200" />
              <div className="h-2 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Bell size={15} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div
                  className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}
                >
                  <s.Icon size={15} />
                </div>
                <div className="text-lg font-bold text-slate-800">{s.v}</div>
                <div className="mt-1 h-2 w-12 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="h-2.5 w-28 rounded-full bg-slate-200" />
              <div className="h-2 w-10 rounded-full bg-slate-100" />
            </div>
            <div className="divide-y divide-slate-50">
              {["09:30", "10:15", "11:00"].map((time) => (
                <div key={time} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-100 to-portal-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-32 rounded-full bg-slate-200" />
                    <div className="h-2 w-20 rounded-full bg-slate-100" />
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {time}
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
