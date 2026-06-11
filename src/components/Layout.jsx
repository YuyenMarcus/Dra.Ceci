import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  CalendarDays,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Share2,
  HeartPulse,
  Settings as SettingsIcon,
  ConciergeBell,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { initials, formatLongDate } from "../lib/format.js";
import { updateClinic, logEvent, touchClinicActivity } from "../store/db.js";
import Tour from "./Tour.jsx";
import Modal from "./Modal.jsx";
import Paywall from "./Paywall.jsx";
import TrialBanner from "./TrialBanner.jsx";
import BrandMark from "./BrandMark.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
import { useSeo } from "../lib/seo.js";

const TOUR_KEY = "medtrack.tour.doctor";

// Throttle feature-open logging to at most once per route per 10 minutes so the
// usage log stays meaningful (last feature used / engagement) without flooding.
const lastFeatureLog = {};
const FEATURE_LOG_THROTTLE_MS = 10 * 60 * 1000;

const nav = [
  { to: "/app", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, tour: "nav-dashboard", reception: true },
  { to: "/app/inventory", labelKey: "nav.inventory", icon: Boxes, tour: "nav-inventory", reception: true },
  { to: "/app/clients", labelKey: "nav.clients", icon: Users, tour: "nav-clients" },
  { to: "/app/appointments", labelKey: "nav.appointments", icon: CalendarDays, tour: "nav-appointments", reception: true },
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

function SidebarContent({ onNavigate, t, items = nav, userName, userSpecialty }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <BrandMark size={38} rounded="rounded-xl" />
        <div>
          <p className="text-[17px] font-bold leading-none tracking-tight text-white">
            Clinika
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-brand-300/80">
            {t("layout.clinicOps")}
          </p>
        </div>
      </div>

      <div className="mx-5 mb-4 h-px bg-white/10" />

      <p className="mb-2 px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300/60">
        {t("layout.menu")}
      </p>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map(({ to, labelKey, icon: Icon, end, tour }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-tour={tour}
            onClick={onNavigate}
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
            className={({ isActive }) =>
              [
                "animate-fade-up group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-brand-100/75 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-300 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  size={18}
                  className={isActive ? "text-brand-300" : "text-brand-200/60 transition-colors group-hover:text-brand-200"}
                />
                {t(labelKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 mt-4 rounded-xl bg-white/[0.06] p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-300/20 text-sm font-semibold text-brand-200">
            {initials(userName || "DR")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {userName || t("common.doctor")}
            </p>
            <p className="truncate text-[11px] text-brand-200/70">
              {userSpecialty || t("common.clinician")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    clinic,
    logout,
    refreshClinic,
    canSwitchRoles,
    receptionMode,
    exitReception,
    isAdmin,
    access,
  } = useAuth();
  const { t } = useLang();
  const title = titles[location.pathname]
    ? t(titles[location.pathname])
    : "Clinika";

  // The whole doctor app is private — keep it out of search engines.
  useSeo({
    title: title === "Clinika" ? "Clinika" : `${title} | Clinika`,
    noindex: true,
  });

  const navItems = receptionMode ? nav.filter((n) => n.reception) : nav;

  // Log which feature the doctor opened (powers "last feature used" + activity
  // recency in the admin console). Throttled per route; clinic-scoped.
  const clinicIdForLog = clinic?.id;
  useEffect(() => {
    if (!clinicIdForLog) return;
    const feature = location.pathname.replace(/^\/app\/?/, "") || "dashboard";
    const key = `${clinicIdForLog}:${feature}`;
    const now = Date.now();
    if (now - (lastFeatureLog[key] || 0) < FEATURE_LOG_THROTTLE_MS) return;
    lastFeatureLog[key] = now;
    logEvent("feature.open", { feature }, clinicIdForLog);
  }, [location.pathname, clinicIdForLog]);

  // Stamp the clinic as "active today" so it stays in the public directory.
  // Throttled to once per calendar day per clinic to avoid needless writes.
  useEffect(() => {
    if (!clinic?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `medtrack.activeTouch.${clinic.id}`;
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
    touchClinicActivity(clinic.id, clinic.profile || {});
  }, [clinic?.id]);

  // Some ad-block / content-filter extensions inject `display:none !important`
  // on the sidebar (it survived even after switching <aside> to <div>). A
  // stylesheet rule can't beat an extension's author-origin !important, but an
  // INLINE !important does (this is exactly what fixed it in testing). Drive it
  // from a media query so the sidebar still only shows on md+.
  const sidebarRef = useRef(null);
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return undefined;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () =>
      el.style.setProperty("display", mq.matches ? "flex" : "none", "important");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const [exitOpen, setExitOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  function tryExit(e) {
    e.preventDefault();
    if (exitReception(pin)) {
      setExitOpen(false);
      setPin("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  const doctorTourSteps = [
    { title: t("dtour.1.title"), body: t("dtour.1.body") },
    { selector: '[data-tour="nav-dashboard"]', title: t("dtour.2.title"), body: t("dtour.2.body") },
    { selector: '[data-tour="nav-inventory"]', title: t("dtour.3.title"), body: t("dtour.3.body") },
    { selector: '[data-tour="nav-clients"]', title: t("dtour.4.title"), body: t("dtour.4.body") },
    { selector: '[data-tour="nav-appointments"]', title: t("dtour.5.title"), body: t("dtour.5.body") },
    { selector: '[data-tour="nav-profile"]', title: t("dtour.6.title"), body: t("dtour.6.body") },
    { selector: '[data-tour="nav-settings"]', title: t("dtour.7.title"), body: t("dtour.7.body") },
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

  // Trial + 24-hour grace period have lapsed with no active subscription: lock
  // the whole doctor app behind the paywall until billing is active.
  if (access?.state === "locked") return <Paywall />;

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar. Intentionally a <div>, not <aside>: ad-block/content
          "cosmetic filter" extensions frequently inject `display:none !important`
          on <aside> tags, which would hide the whole nav in some Chrome setups. */}
      <div
        ref={sidebarRef}
        className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-brand-900 via-brand-950 to-brand-950 md:flex"
      >
        <SidebarContent
          t={t}
          items={navItems}
          userName={currentUser?.name}
          userSpecialty={currentUser?.specialty}
        />
      </div>

      {/* Slide-in nav drawer — phone only (the burger that opens it is
          md:hidden). On md+ the persistent desktop sidebar above is the nav. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-gradient-to-b from-brand-900 via-brand-950 to-brand-950">
            <button
              className="absolute right-3 top-5 rounded-lg p-1.5 text-brand-100 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label={t("layout.closeMenu")}
            >
              <X size={18} />
            </button>
            <SidebarContent
              t={t}
              items={navItems}
              userName={currentUser?.name}
              userSpecialty={currentUser?.specialty}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("layout.openMenu")}
            >
              <Menu size={20} />
              <span className="text-sm font-medium">{t("layout.menu")}</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="hidden text-[11px] capitalize leading-none text-slate-400 sm:block">
                {formatLongDate()}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isAdmin && !receptionMode && (
              <button
                className="btn-ghost px-3 py-2 text-xs"
                onClick={() => navigate("/admin")}
                title={t("admin.title")}
              >
                <ShieldCheck size={15} />
                <span className="hidden lg:inline">{t("nav.admin")}</span>
              </button>
            )}
            {!receptionMode && canSwitchRoles && (
              <button
                className="btn-ghost px-3 py-2 text-xs text-portal-700 hover:bg-portal-50"
                onClick={() => navigate("/me")}
                title={t("layout.switchToPatient")}
              >
                <HeartPulse size={15} />
                <span className="hidden lg:inline">{t("layout.patientPortal")}</span>
              </button>
            )}
            <button
              className="btn-ghost px-3 py-2 text-xs"
              onClick={() => setTourOpen(true)}
              title={t("layout.replayTour")}
            >
              <HelpCircle size={15} />
              <span className="hidden lg:inline">{t("layout.tour")}</span>
            </button>
            <ThemeToggle />

            <div className="mx-1.5 hidden h-6 w-px bg-slate-200 sm:block" />

            {/* Compact identity on phones (the sidebar card covers md+) */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 md:hidden">
              {currentUser ? initials(currentUser.name) : "DR"}
            </div>

            <button
              className="btn-ghost px-3 py-2 text-xs"
              onClick={signOut}
              title={t("layout.signOut")}
            >
              <LogOut size={15} />
              <span className="hidden lg:inline">{t("layout.signOut")}</span>
            </button>
          </div>
        </header>

        <TrialBanner access={access} />

        {receptionMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 md:px-8">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <ConciergeBell size={16} />
              {t("reception.banner")}
            </p>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              onClick={() => {
                setPin("");
                setPinError(false);
                setExitOpen(true);
              }}
            >
              <Lock size={14} /> {t("reception.exit")}
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div
            key={location.pathname}
            className="animate-fade-up mx-auto w-full max-w-[1440px]"
          >
            {children}
          </div>
        </main>
      </div>

      <Tour steps={doctorTourSteps} open={tourOpen} onClose={closeTour} />

      {/* Exit reception mode (PIN required) */}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title={t("reception.exitTitle")}
        footer={
          <>
            <button className="btn-outline" onClick={() => setExitOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn-primary" form="reception-exit" type="submit">
              <Lock size={16} /> {t("reception.unlock")}
            </button>
          </>
        }
      >
        <form id="reception-exit" onSubmit={tryExit} className="space-y-3">
          <p className="text-sm text-slate-500">{t("reception.exitHint")}</p>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setPinError(false);
            }}
            placeholder={t("reception.enterPin")}
          />
          {pinError && (
            <p className="text-sm font-medium text-rose-600">{t("reception.wrongPin")}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
