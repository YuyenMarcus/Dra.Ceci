import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  CalendarDays,
  Stethoscope,
  Menu,
  X,
  RotateCcw,
  LogOut,
  HelpCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { initials } from "../lib/format.js";
import Tour from "./Tour.jsx";

const TOUR_KEY = "medtrack.tour.doctor";

const nav = [
  { to: "/app", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, tour: "nav-dashboard" },
  { to: "/app/inventory", labelKey: "nav.inventory", icon: Boxes, tour: "nav-inventory" },
  { to: "/app/clients", labelKey: "nav.clients", icon: Users, tour: "nav-clients" },
  { to: "/app/appointments", labelKey: "nav.appointments", icon: CalendarDays, tour: "nav-appointments" },
  { to: "/app/settings", labelKey: "nav.settings", icon: SettingsIcon, tour: "nav-settings" },
];

const titles = {
  "/app": "nav.dashboard",
  "/app/inventory": "nav.inventory",
  "/app/clients": "nav.clients",
  "/app/appointments": "nav.appointments",
  "/app/settings": "nav.settings",
};

function SidebarContent({ onNavigate, t }) {
  return (
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Stethoscope size={20} />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-white">MedTrack</p>
          <p className="mt-1 text-xs text-brand-200">{t("layout.clinicOps")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, labelKey, icon: Icon, end, tour }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-tour={tour}
            onClick={onNavigate}
            style={{ animationDelay: `${0.12 + i * 0.07}s` }}
            className={({ isActive }) =>
              [
                "animate-fade-up flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-brand-100 hover:bg-white/5 hover:text-white hover:translate-x-0.5",
              ].join(" ")
            }
          >
            <Icon size={18} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 text-xs text-brand-200/80">
        {t("layout.localData")}
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { resetData } = useStore();
  const { currentUser, logout } = useAuth();
  const { t } = useLang();
  const title = titles[location.pathname]
    ? t(titles[location.pathname])
    : "MedTrack";

  const doctorTourSteps = [
    { title: t("dtour.1.title"), body: t("dtour.1.body") },
    { selector: '[data-tour="nav-dashboard"]', title: t("dtour.2.title"), body: t("dtour.2.body") },
    { selector: '[data-tour="nav-inventory"]', title: t("dtour.3.title"), body: t("dtour.3.body") },
    { selector: '[data-tour="nav-clients"]', title: t("dtour.4.title"), body: t("dtour.4.body") },
    { selector: '[data-tour="nav-appointments"]', title: t("dtour.5.title"), body: t("dtour.5.body") },
    { selector: '[data-tour="reset"]', title: t("dtour.6.title"), body: t("dtour.6.body") },
  ];

  const [tourOpen, setTourOpen] = useState(false);

  // Auto-start the walkthrough once per browser for first-time users.
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function closeTour() {
    localStorage.setItem(TOUR_KEY, "1");
    setTourOpen(false);
  }

  function signOut() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-brand-800 to-brand-900 lg:flex">
        <SidebarContent t={t} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-gradient-to-b from-brand-800 to-brand-900">
            <button
              className="absolute right-3 top-5 rounded-lg p-1.5 text-brand-100 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label={t("layout.closeMenu")}
            >
              <X size={18} />
            </button>
            <SidebarContent t={t} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3.5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("layout.openMenu")}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost text-xs"
              onClick={() => setTourOpen(true)}
              title={t("layout.replayTour")}
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">{t("layout.tour")}</span>
            </button>
            <button
              data-tour="reset"
              className="btn-ghost text-xs"
              onClick={() => {
                if (confirm(t("layout.resetConfirm"))) resetData();
              }}
              title={t("layout.resetDataTitle")}
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">{t("layout.resetData")}</span>
            </button>
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {currentUser ? initials(currentUser.name) : "DR"}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-none text-slate-800">
                  {currentUser?.name ?? t("common.doctor")}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {currentUser?.specialty ?? t("common.clinician")}
                </p>
              </div>
            </div>
            <button
              className="btn-ghost text-xs"
              onClick={signOut}
              title={t("layout.signOut")}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">{t("layout.signOut")}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <Tour steps={doctorTourSteps} open={tourOpen} onClose={closeTour} />
    </div>
  );
}
