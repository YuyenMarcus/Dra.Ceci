import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  CalendarDays,
  Stethoscope,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Share2,
  HeartPulse,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { initials } from "../lib/format.js";
import { updateClinic } from "../store/db.js";
import Tour from "./Tour.jsx";

const TOUR_KEY = "medtrack.tour.doctor";

const nav = [
  { to: "/app", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, tour: "nav-dashboard" },
  { to: "/app/inventory", labelKey: "nav.inventory", icon: Boxes, tour: "nav-inventory" },
  { to: "/app/clients", labelKey: "nav.clients", icon: Users, tour: "nav-clients" },
  { to: "/app/appointments", labelKey: "nav.appointments", icon: CalendarDays, tour: "nav-appointments" },
  { to: "/app/profile", labelKey: "nav.profile", icon: Share2, tour: "nav-profile" },
  { to: "/app/settings", labelKey: "nav.settings", icon: SettingsIcon, tour: "nav-settings" },
];

const titles = {
  "/app": "nav.dashboard",
  "/app/inventory": "nav.inventory",
  "/app/clients": "nav.clients",
  "/app/appointments": "nav.appointments",
  "/app/profile": "nav.profile",
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
  const { currentUser, clinic, logout, refreshClinic, canSwitchRoles } = useAuth();
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
    { selector: '[data-tour="nav-settings"]', title: t("dtour.6.title"), body: t("dtour.6.body") },
  ];

  const [tourOpen, setTourOpen] = useState(false);

  // The walkthrough must appear ONLY at initial setup, never again on later
  // logins. "Seen" is recorded two ways: a localStorage guard (instant, per
  // browser) and `profile.onboarded` on the clinic account (persists across
  // cache clears and other browsers). We mark it the moment the tour is shown —
  // not when it's closed — so it can't reappear even if the user refreshes or
  // closes it abruptly mid-tour.
  const clinicId = clinic?.id;
  const onboarded = Boolean(clinic?.profile?.onboarded);

  const markOnboarded = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* storage may be unavailable; the server flag below still covers us */
    }
    if (clinic && !clinic.profile?.onboarded) {
      // Fire-and-forget: persist on the account so it never shows again.
      updateClinic(clinic.id, {
        profile: { ...(clinic.profile || {}), onboarded: true },
      })
        .then(() => refreshClinic())
        .catch((err) => console.error("Could not save onboarding flag:", err));
    }
  }, [clinic, refreshClinic]);

  useEffect(() => {
    if (!clinicId || onboarded) return undefined;
    if (localStorage.getItem(TOUR_KEY)) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setTourOpen(true);
      markOnboarded();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Keyed on clinicId (stable) + onboarded so a new clinic object reference
    // from refreshClinic doesn't cancel/re-arm the timer in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, onboarded]);

  function closeTour() {
    setTourOpen(false);
    markOnboarded();
  }

  function signOut() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-brand-800 to-brand-900 md:flex">
        <SidebarContent t={t} />
      </aside>

      {/* Slide-in nav drawer — available at every width as a guaranteed
          fallback, so navigation is reachable even if the persistent desktop
          sidebar is hidden by browser zoom/width quirks. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3.5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
              aria-label={t("layout.openMenu")}
            >
              <Menu size={20} />
              <span className="text-sm font-medium">{t("layout.menu")}</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {canSwitchRoles && (
              <button
                className="btn-ghost text-xs text-portal-700 hover:bg-portal-50"
                onClick={() => navigate("/me")}
                title={t("layout.switchToPatient")}
              >
                <HeartPulse size={15} />
                <span className="hidden sm:inline">{t("layout.patientPortal")}</span>
              </button>
            )}
            <button
              className="btn-ghost text-xs"
              onClick={() => setTourOpen(true)}
              title={t("layout.replayTour")}
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">{t("layout.tour")}</span>
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

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div key={location.pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <Tour steps={doctorTourSteps} open={tourOpen} onClose={closeTour} />
    </div>
  );
}
