import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Ban,
  CalendarPlus,
  CalendarClock,
  CalendarRange,
  Check,
  Loader2,
  LayoutGrid,
  ListChecks,
  Wand2,
  Copy,
  Eye,
  AlertTriangle,
  Timer,
  Hourglass,
  CalendarDays,
  Users,
  Repeat,
  Lock,
  Sparkles,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { updateClinic, listMyLocations, saveLocation } from "../store/db.js";
import {
  minToHm,
  upcomingWorkingDays,
  generateSlots,
  dateKey,
  monthMatrix,
} from "../lib/availability.js";

const LOCALES = { es: "es-ES", en: "en-US" };

// Weekday order for the editor: Monday-first for humans, but we key by
// getDay() index (0=Sun … 6=Sat) to match the availability engine.
const WEEK = [
  { idx: 1, key: "day.mon" },
  { idx: 2, key: "day.tue" },
  { idx: 3, key: "day.wed" },
  { idx: 4, key: "day.thu" },
  { idx: 5, key: "day.fri" },
  { idx: 6, key: "day.sat" },
  { idx: 0, key: "day.sun" },
];

// Sunday-first weekday headers for the date-picker calendar (matches
// monthMatrix, whose weeks start on Sunday).
const DOW = ["day.sun", "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat"];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function Section({ icon: Icon, title, hint, children, right, eyebrow }) {
  return (
    <div className="card p-6">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon size={20} />
          </div>
          <div>
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                {eyebrow}
              </p>
            )}
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {hint && <p className="text-sm text-slate-500">{hint}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// A card whose body is hidden until the header is clicked. Used for the
// optional / advanced controls so the default page stays short and scannable.
function Collapsible({ icon: Icon, title, hint, children, defaultOpen = false, eyebrow }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon size={20} />
          </div>
          <div>
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                {eyebrow}
              </p>
            )}
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {hint && <p className="text-sm text-slate-500">{hint}</p>}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-6 pb-6 pt-5 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}

// Build the initial weekly windows from the rich config, or fall back to the
// clinic's legacy single-window schedule so first-time editors aren't blank.
function initialWeekly(av, days = [1, 2, 3, 4, 5], defStart = "08:00", defEnd = "17:00") {
  if (av && av.weekly && typeof av.weekly === "object") {
    const out = {};
    for (const { idx } of WEEK) {
      const list = av.weekly[String(idx)] || av.weekly[idx] || [];
      out[idx] = Array.isArray(list)
        ? list.map((w) => ({ start: w.start || "", end: w.end || "" }))
        : [];
    }
    return out;
  }
  // First-time default: open on the given days at the given hours.
  const out = {};
  for (const { idx } of WEEK) {
    out[idx] = days.includes(idx) ? [{ start: defStart, end: defEnd }] : [];
  }
  return out;
}

// Decide whether a saved config should open in the simple "standard" view or
// the full "custom" view.
function initialPreset(av) {
  if (av?.preset === "standard" || av?.preset === "custom") return av.preset;
  if (!av || !Object.keys(av).length) return "standard";
  if (av.mode === "published" || av.mode === "dates") return "custom";
  if (Array.isArray(av.activeRanges) && av.activeRanges.length) return "custom";
  if (Array.isArray(av.exceptions) && av.exceptions.length) return "custom";
  // Multiple windows on any day (split shift) → custom.
  const weekly = av.weekly || {};
  for (const k of Object.keys(weekly)) {
    if (Array.isArray(weekly[k]) && weekly[k].length > 1) return "custom";
  }
  return "standard";
}

// The shared open/close time (and optional lunch gap) across all open days,
// for the standard view. Two windows on a day read as morning + afternoon
// around a lunch break.
function deriveStdTimes(weekly) {
  for (const { idx } of WEEK) {
    const wins = weekly[idx] || [];
    const first = wins[0];
    if (!first?.start || !first?.end) continue;
    if (wins.length >= 2 && wins[1]?.start && wins[1]?.end) {
      return {
        start: first.start,
        end: wins[1].end,
        lunch: true,
        lunchStart: first.end,
        lunchEnd: wins[1].start,
      };
    }
    return { start: first.start, end: first.end, lunch: false, lunchStart: "12:00", lunchEnd: "13:00" };
  }
  return { start: "08:00", end: "17:00", lunch: false, lunchStart: "12:00", lunchEnd: "13:00" };
}

// Read-only teaser shown to Starter clinics: they can see what custom
// availability looks like, but every control is locked behind an upgrade.
function LockedAvailability({ t }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("avail.title")}
        </h1>
        <p className="text-sm text-slate-500">{t("avail.subtitle")}</p>
      </div>
      <div className="relative">
        <div className="pointer-events-none space-y-3 opacity-50 blur-[1.5px]" aria-hidden>
          {[t("avail.presetStandard"), t("avail.weeklyTitle"), t("avail.rulesTitle")].map((s) => (
            <div key={s} className="card flex items-center gap-3 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <Clock size={17} />
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{s}</p>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="card max-w-md p-6 text-center shadow-xl dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              <Lock size={22} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("avail.lockTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("avail.lockBody")}</p>
            <Link to="/app/settings" className="btn-primary mt-5">
              <Sparkles size={16} /> {t("avail.lockCta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Availability() {
  const { clinic, refreshClinic, can } = useAuth();
  const { t } = useLang();
  const [refreshed, setRefreshed] = useState(false);
  const [locations, setLocations] = useState([]);
  const [targetId, setTargetId] = useState("clinic");

  const reloadLocations = useCallback(async () => {
    if (!clinic?.id) return;
    try {
      setLocations(await listMyLocations(clinic.id));
    } catch (err) {
      console.debug("listMyLocations failed:", err?.message);
    }
  }, [clinic?.id]);

  // Pull the freshest clinic record + branches, then mount the editor keyed on
  // the target so all state hydrates from real data.
  useEffect(() => {
    let active = true;
    Promise.all([Promise.resolve(refreshClinic?.()), reloadLocations()]).finally(
      () => active && setRefreshed(true)
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!clinic) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!can("customAvailability")) {
    return <LockedAvailability t={t} />;
  }

  const location = locations.find((l) => l.id === targetId) || null;
  const target = location ? { type: "location", location } : { type: "clinic" };

  return (
    <AvailabilityEditor
      key={`${clinic.id}:${targetId}:${refreshed}`}
      clinic={clinic}
      target={target}
      locations={locations}
      targetId={targetId}
      onTargetChange={setTargetId}
      refreshClinic={refreshClinic}
      reloadLocations={reloadLocations}
    />
  );
}

function AvailabilityEditor({
  clinic,
  target,
  locations,
  targetId,
  onTargetChange,
  refreshClinic,
  reloadLocations,
}) {
  const { t, lang } = useLang();
  const isLocation = target.type === "location";
  const legacy = isLocation
    ? target.location
    : {
        workingDays: clinic.workingDays,
        startHour: clinic.startHour,
        endHour: clinic.endHour,
        slotMinutes: clinic.slotMinutes,
      };
  const av = (isLocation ? target.location?.availability : clinic.profile?.availability) || {};
  const legacyDays = legacy?.workingDays || [1, 2, 3, 4, 5];
  const defStart = isLocation && Number.isFinite(legacy?.startHour) ? minToHm(legacy.startHour * 60) : "08:00";
  const defEnd = isLocation && Number.isFinite(legacy?.endHour) ? minToHm(legacy.endHour * 60) : "17:00";
  const [preset, setPreset] = useState(() => initialPreset(av));
  const [mode, setMode] = useState(
    av.mode === "published" ? "published" : av.mode === "dates" ? "dates" : "windows"
  );
  const [slotMinutes, setSlotMinutes] = useState(
    Number.isFinite(av.slotMinutes) ? av.slotMinutes : legacy?.slotMinutes || 30
  );
  const [bufferMin, setBufferMin] = useState(Number.isFinite(av.bufferMin) ? av.bufferMin : 0);
  const [noticeHours, setNoticeHours] = useState(
    Number.isFinite(av.minNoticeMin) ? Math.round(av.minNoticeMin / 60) : 0
  );
  const [horizonDays, setHorizonDays] = useState(
    Number.isFinite(av.horizonDays) ? av.horizonDays : 60
  );
  const [capacity, setCapacity] = useState(
    Number.isFinite(av.capacity) && av.capacity > 0 ? av.capacity : 1
  );
  // Preserve advanced config when in Standard so switching back is lossless.
  const [customBackup, setCustomBackup] = useState(av._customBackup || null);
  const [weekly, setWeekly] = useState(() => initialWeekly(av, legacyDays, defStart, defEnd));
  // In "dates" mode the saved exceptions ARE the picked dates, so they hydrate
  // the calendar below instead of the generic exceptions editor.
  const [exceptions, setExceptions] = useState(
    Array.isArray(av.exceptions) && av.mode !== "dates"
      ? av.exceptions.map((e) => ({ id: e.id || uid(), ...e }))
      : []
  );
  const [pickedDates, setPickedDates] = useState(() => {
    if (av.mode !== "dates" || !Array.isArray(av.exceptions)) return new Set();
    return new Set(av.exceptions.filter((e) => e.kind === "open" && e.date).map((e) => e.date));
  });
  const firstPicked =
    av.mode === "dates" && Array.isArray(av.exceptions)
      ? av.exceptions.find((e) => e.kind === "open" && e.start && e.end)
      : null;
  const [pickStart, setPickStart] = useState(firstPicked?.start || "08:00");
  const [pickEnd, setPickEnd] = useState(firstPicked?.end || "17:00");
  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [activeRanges, setActiveRanges] = useState(
    Array.isArray(av.activeRanges)
      ? av.activeRanges.map((r) => ({ id: uid(), start: r.start || "", end: r.end || "" }))
      : []
  );
  const [offRanges, setOffRanges] = useState(
    Array.isArray(av.offRanges)
      ? av.offRanges.map((r) => ({ id: uid(), start: r.start || "", end: r.end || "" }))
      : []
  );
  const initialStd = deriveStdTimes(initialWeekly(av, legacyDays, defStart, defEnd));
  const [stdStart, setStdStart] = useState(initialStd.start);
  const [stdEnd, setStdEnd] = useState(initialStd.end);
  const [stdLunch, setStdLunch] = useState(initialStd.lunch);
  const [stdLunchStart, setStdLunchStart] = useState(initialStd.lunchStart);
  const [stdLunchEnd, setStdLunchEnd] = useState(initialStd.lunchEnd);
  const [published, setPublished] = useState(() => {
    const list = Array.isArray(av.published) ? av.published : [];
    return list.map((p) => {
      const d = new Date(p.start);
      const ok = !Number.isNaN(d.getTime());
      const pad = (n) => String(n).padStart(2, "0");
      return {
        id: uid(),
        date: ok ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "",
        time: ok ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "",
        durationMin: Number.isFinite(p.durationMin) ? p.durationMin : 30,
      };
    });
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Bumped on every successful save so the "Saved" badge remounts and its
  // pop animation replays even when saving twice in a row.
  const [savedTick, setSavedTick] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  // Warn before leaving with unsaved edits (covers reload / tab close).
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Quick-setup controls: fill the whole week in one action.
  const [qsDays, setQsDays] = useState(() => new Set([1, 2, 3, 4, 5]));
  const [qsStart, setQsStart] = useState("09:00");
  const [qsEnd, setQsEnd] = useState("17:00");
  const [qsLunch, setQsLunch] = useState(false);
  const [qsLunchStart, setQsLunchStart] = useState("12:00");
  const [qsLunchEnd, setQsLunchEnd] = useState("13:00");

  // Published-mode generator: build many slots from a range + interval.
  const [genDate, setGenDate] = useState("");
  const [genStart, setGenStart] = useState("09:00");
  const [genEnd, setGenEnd] = useState("17:00");
  const [genEvery, setGenEvery] = useState(30);

  // Active-range recurrence: repeat a burst on a fixed rotation.
  const [recStart, setRecStart] = useState("");
  const [recDays, setRecDays] = useState(7);
  const [recEvery, setRecEvery] = useState("month");
  const [recCount, setRecCount] = useState(6);

  const touch = () => {
    setSaved(false);
    setDirty(true);
  };

  // Numeric inputs: allow an empty field while typing (so it can be cleared and
  // retyped). Final values are clamped in buildAvailability on save.
  const onNum = (setter) => (e) => {
    const v = e.target.value;
    if (v === "") {
      setter("");
    } else {
      const n = parseInt(v, 10);
      setter(Number.isNaN(n) ? "" : n);
    }
    touch();
  };

  function toggleDay(idx) {
    setWeekly((w) => ({
      ...w,
      [idx]: (w[idx] || []).length ? [] : [{ start: "09:00", end: "17:00" }],
    }));
    touch();
  }
  function addWindow(idx) {
    setWeekly((w) => ({ ...w, [idx]: [...(w[idx] || []), { start: "09:00", end: "13:00" }] }));
    touch();
  }
  function setWindow(idx, i, key, val) {
    setWeekly((w) => ({
      ...w,
      [idx]: (w[idx] || []).map((win, j) => (j === i ? { ...win, [key]: val } : win)),
    }));
    touch();
  }
  function removeWindow(idx, i) {
    setWeekly((w) => ({ ...w, [idx]: (w[idx] || []).filter((_, j) => j !== i) }));
    touch();
  }

  // Copy one day's windows to every other day.
  function copyDayToAll(idx) {
    setWeekly((w) => {
      const src = (w[idx] || []).map((win) => ({ ...win }));
      const next = {};
      for (const { idx: d } of WEEK) next[d] = src.map((win) => ({ ...win }));
      return next;
    });
    touch();
  }

  // Build the window list implied by the quick-setup controls (handles the
  // optional lunch break by splitting into a morning + afternoon window).
  function quickWindows(start, end, lunch, lunchStart, lunchEnd) {
    if (lunch && lunchStart > start && lunchEnd < end && lunchEnd > lunchStart) {
      return [
        { start, end: lunchStart },
        { start: lunchEnd, end },
      ];
    }
    return [{ start, end }];
  }

  function applyQuickSetup() {
    if (!(qsEnd > qsStart)) {
      setError(t("avail.errRange"));
      return;
    }
    setError("");
    const wins = quickWindows(qsStart, qsEnd, qsLunch, qsLunchStart, qsLunchEnd);
    setWeekly(() => {
      const next = {};
      for (const { idx } of WEEK) {
        next[idx] = qsDays.has(idx) ? wins.map((w) => ({ ...w })) : [];
      }
      return next;
    });
    touch();
  }

  function toggleQsDay(idx) {
    setQsDays((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // One-tap common patterns: set the quick-setup controls and apply at once.
  function applyPreset(days, start, end, lunch) {
    const wins = quickWindows(start, end, lunch, "12:00", "13:00");
    setQsDays(new Set(days));
    setQsStart(start);
    setQsEnd(end);
    setQsLunch(lunch);
    setWeekly(() => {
      const next = {};
      for (const { idx } of WEEK) next[idx] = days.includes(idx) ? wins.map((w) => ({ ...w })) : [];
      return next;
    });
    touch();
  }

  function generatePublished() {
    if (!genDate || !(genEnd > genStart)) {
      setError(t("avail.errRange"));
      return;
    }
    setError("");
    const toMin = (hm) => {
      const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
      return h * 60 + (m || 0);
    };
    const step = Number(genEvery) || 30;
    const startM = toMin(genStart);
    const endM = toMin(genEnd);
    const made = [];
    for (let m = startM; m + step <= endM; m += step) {
      const pad = (n) => String(n).padStart(2, "0");
      made.push({
        id: uid(),
        date: genDate,
        time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
        durationMin: step,
      });
    }
    setPublished((prev) => {
      const seen = new Set(prev.map((p) => `${p.date}T${p.time}`));
      const merged = [...prev];
      for (const s of made) {
        const k = `${s.date}T${s.time}`;
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(s);
        }
      }
      return merged.sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
      );
    });
    touch();
  }

  // --- Standard view helpers: one shared open/close time (and optional lunch
  // break) across chosen days ---
  function stdDayWindows(cfg = {}) {
    const start = cfg.start ?? stdStart;
    const end = cfg.end ?? stdEnd;
    const lunch = cfg.lunch ?? stdLunch;
    const lunchStart = cfg.lunchStart ?? stdLunchStart;
    const lunchEnd = cfg.lunchEnd ?? stdLunchEnd;
    return quickWindows(start, end, lunch, lunchStart, lunchEnd);
  }
  // Re-apply the shared windows to every currently open day.
  function applyStdWindows(cfg = {}) {
    const wins = stdDayWindows(cfg);
    setWeekly((w) => {
      const next = {};
      for (const { idx } of WEEK) {
        next[idx] = (w[idx] || []).length ? wins.map((win) => ({ ...win })) : [];
      }
      return next;
    });
    touch();
  }
  function toggleStdDay(idx) {
    setWeekly((w) => ({
      ...w,
      [idx]: (w[idx] || []).length ? [] : stdDayWindows(),
    }));
    touch();
  }
  function setStdTime(which, val) {
    if (which === "start") setStdStart(val);
    else setStdEnd(val);
    applyStdWindows({ [which]: val });
  }
  function setStdLunchOn(on) {
    setStdLunch(on);
    applyStdWindows({ lunch: on });
  }
  function setStdLunchTime(which, val) {
    if (which === "lunchStart") setStdLunchStart(val);
    else setStdLunchEnd(val);
    applyStdWindows({ [which]: val });
  }

  // --- "Pick my dates" calendar helpers ---
  function toggleDate(dk) {
    setPickedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dk)) next.delete(dk);
      else next.add(dk);
      return next;
    });
    touch();
  }
  function clearPicked() {
    setPickedDates(new Set());
    touch();
  }
  function moveMonth(delta) {
    setCalCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function addOffRange() {
    setOffRanges((r) => [...r, { id: uid(), start: "", end: "" }]);
    touch();
  }
  function setOffRange(i, key, val) {
    setOffRanges((r) => r.map((rg, j) => (j === i ? { ...rg, [key]: val } : rg)));
    touch();
  }
  function removeOffRange(i) {
    setOffRanges((r) => r.filter((_, j) => j !== i));
    touch();
  }

  function addRange() {
    setActiveRanges((r) => [...r, { id: uid(), start: "", end: "" }]);
    touch();
  }
  function generateRanges() {
    if (!recStart || recCount < 1 || recDays < 1) {
      setError(t("avail.errRange"));
      return;
    }
    setError("");
    const [y, m, d] = recStart.split("-").map((n) => parseInt(n, 10));
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const weeks = recEvery === "week" ? 1 : recEvery === "2weeks" ? 2 : recEvery === "4weeks" ? 4 : 0;
    const made = [];
    for (let i = 0; i < recCount; i++) {
      let s;
      if (recEvery === "month") s = new Date(y, m - 1 + i, d);
      else {
        s = new Date(y, m - 1, d);
        s.setDate(s.getDate() + i * weeks * 7);
      }
      const e = new Date(s);
      e.setDate(e.getDate() + (recDays - 1));
      made.push({ id: uid(), start: fmt(s), end: fmt(e) });
    }
    setActiveRanges((prev) => {
      const seen = new Set(prev.map((r) => `${r.start}|${r.end}`));
      const merged = [...prev];
      for (const r of made) {
        const k = `${r.start}|${r.end}`;
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(r);
        }
      }
      return merged.sort((a, b) => a.start.localeCompare(b.start));
    });
    touch();
  }
  function setRange(i, key, val) {
    setActiveRanges((r) => r.map((rg, j) => (j === i ? { ...rg, [key]: val } : rg)));
    touch();
  }
  function removeRange(i) {
    setActiveRanges((r) => r.filter((_, j) => j !== i));
    touch();
  }

  function addException(kind) {
    setExceptions((e) => [
      ...e,
      { id: uid(), date: "", kind, start: kind === "open" ? "09:00" : "", end: kind === "open" ? "10:00" : "" },
    ]);
    touch();
  }
  function setException(i, key, val) {
    setExceptions((e) => e.map((ex, j) => (j === i ? { ...ex, [key]: val } : ex)));
    touch();
  }
  function removeException(i) {
    setExceptions((e) => e.filter((_, j) => j !== i));
    touch();
  }

  function addPublished() {
    setPublished((p) => [...p, { id: uid(), date: "", time: "09:00", durationMin: slotMinutes }]);
    touch();
  }
  function setPub(i, key, val) {
    setPublished((p) => p.map((s, j) => (j === i ? { ...s, [key]: val } : s)));
    touch();
  }
  function removePub(i) {
    setPublished((p) => p.filter((_, j) => j !== i));
    touch();
  }

  const summary = useMemo(() => {
    if (preset === "custom" && mode === "published")
      return t("avail.summaryPublished", { n: published.length });
    if (preset === "custom" && mode === "dates")
      return t("avail.summaryDates", { n: pickedDates.size });
    const openDays = WEEK.filter(({ idx }) => (weekly[idx] || []).length).length;
    let base = t("avail.summaryWindows", { n: openDays });
    const offCount = offRanges.filter((r) => r.start).length;
    if (preset === "custom") {
      const rangeCount = activeRanges.filter((r) => r.start).length;
      if (rangeCount) base += ` · ${t("avail.summaryRanges", { n: rangeCount })}`;
    }
    if (offCount) base += ` · ${t("avail.summaryOff", { n: offCount })}`;
    return base;
  }, [preset, mode, weekly, published, pickedDates, activeRanges, offRanges, t]);

  // Build the canonical, cleaned availability config from current editor state.
  // Shared by both the live preview and save so what the doctor sees is exactly
  // what gets persisted.
  const builtAvailability = useMemo(() => {
    const cleanWeekly = {};
    for (const { idx } of WEEK) {
      const wins = (weekly[idx] || [])
        .filter((w) => w.start && w.end && w.end > w.start)
        .map((w) => ({ start: w.start, end: w.end }));
      if (wins.length) cleanWeekly[idx] = wins;
    }

    const cleanExceptions = exceptions
      .filter((e) => e.date)
      .map((e) =>
        e.kind === "open"
          ? { date: e.date, kind: "open", start: e.start || "09:00", end: e.end || "17:00" }
          : {
              date: e.date,
              kind: "block",
              ...(e.start ? { start: e.start } : {}),
              ...(e.end ? { end: e.end } : {}),
            }
      );

    const cleanPublished = published
      .filter((p) => p.date && p.time)
      .map((p) => ({
        start: `${p.date}T${p.time}`,
        durationMin: Number(p.durationMin) || Number(slotMinutes) || 30,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));

    const cleanRangeList = (list) =>
      list
        .filter((r) => r.start)
        .map((r) => ({ start: r.start, end: r.end && r.end >= r.start ? r.end : r.start }))
        .sort((a, b) => a.start.localeCompare(b.start));

    const isStd = preset === "standard";
    const isDates = !isStd && mode === "dates";

    // "Pick my dates" persists each chosen day as a one-off "open" exception
    // over an empty week, so the engine opens exactly those days and nothing
    // else. The mode tag "dates" only matters for hydrating this editor — the
    // engine treats it like "windows".
    const pickedExceptions = [...pickedDates]
      .filter(Boolean)
      .sort()
      .map((date) => ({
        date,
        kind: "open",
        start: pickStart || "08:00",
        end: pickEnd && pickEnd > (pickStart || "08:00") ? pickEnd : "17:00",
      }));

    // In Standard the advanced fields aren't shown; persist them empty so the
    // engine matches what the doctor sees, but stash a backup so toggling back
    // to Custom is lossless.
    const advanced = {
      activeRanges: isDates ? [] : cleanRangeList(activeRanges),
      exceptions: isDates ? pickedExceptions : cleanExceptions,
      published: cleanPublished,
      mode: mode === "published" ? "published" : isDates ? "dates" : "windows",
    };
    const backup = isStd
      ? customBackup ||
        (advanced.activeRanges.length || advanced.exceptions.length || advanced.published.length
          ? advanced
          : null)
      : null;

    return {
      preset,
      mode: isStd ? "windows" : advanced.mode,
      slotMinutes: Number(slotMinutes) || 30,
      bufferMin: Math.max(0, Number(bufferMin) || 0),
      minNoticeMin: Math.max(0, (Number(noticeHours) || 0) * 60),
      horizonDays: Math.max(1, Number(horizonDays) || 60),
      capacity: Math.max(1, Number(capacity) || 1),
      weekly: isDates ? {} : cleanWeekly,
      activeRanges: isStd ? [] : advanced.activeRanges,
      offRanges: isDates ? [] : cleanRangeList(offRanges),
      exceptions: isStd ? [] : advanced.exceptions,
      published: isStd || isDates ? [] : advanced.published,
      ...(backup ? { _customBackup: backup } : {}),
    };
  }, [
    preset,
    mode,
    slotMinutes,
    bufferMin,
    noticeHours,
    horizonDays,
    capacity,
    weekly,
    activeRanges,
    offRanges,
    exceptions,
    published,
    pickedDates,
    pickStart,
    pickEnd,
    customBackup,
  ]);

  // Non-blocking validation surfaced inline so silent drops never surprise.
  const warnings = useMemo(() => {
    const out = [];
    if (preset === "custom" && mode === "published") {
      if (!published.some((p) => p.date && p.time)) out.push(t("avail.warnNoPublished"));
    } else if (preset === "custom" && mode === "dates") {
      if (!pickedDates.size) out.push(t("avail.warnNoDates"));
      if (!(pickEnd > pickStart)) out.push(t("avail.errRange"));
    } else {
      let anyOpen = false;
      for (const { idx, key } of WEEK) {
        const wins = (weekly[idx] || []).filter((w) => w.start && w.end);
        if (!wins.length) continue;
        anyOpen = true;
        if (wins.some((w) => w.end <= w.start)) out.push(t("avail.warnBadWindow", { day: t(key) }));
        const sorted = [...wins].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].start < sorted[i - 1].end) {
            out.push(t("avail.warnOverlap", { day: t(key) }));
            break;
          }
        }
      }
      if (!anyOpen) out.push(t("avail.warnNoDays"));
    }
    if (bufferMin + slotMinutes > 0 && Number(slotMinutes) <= 0) out.push(t("avail.warnNoLength"));
    return [...new Set(out)];
  }, [preset, mode, published, weekly, pickedDates, pickStart, pickEnd, bufferMin, slotMinutes, t]);

  // Live "what patients see" preview, computed from the unsaved config so the
  // doctor can trust the result before saving. Existing bookings aren't fetched
  // here — this shows the shape of the schedule, not live occupancy.
  const preview = useMemo(() => {
    const source = { id: clinic.id, availability: builtAvailability };
    const horizon = builtAvailability.horizonDays || 60;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = upcomingWorkingDays(source, 10, today).filter((d) => {
      const diff = Math.round((d - today) / 86400000);
      return diff <= horizon;
    });
    return days.map((d) => {
      const key = dateKey(d);
      const slots = generateSlots(source, key, [], null);
      const avail = slots.filter((s) => s.available);
      return {
        key,
        date: d,
        count: avail.length,
        first: avail[0]?.start,
        last: avail[avail.length - 1]?.start,
      };
    });
  }, [clinic.id, builtAvailability]);

  const fmtPreviewDay = (d) =>
    new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.es, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  const fmtPreviewTime = (iso) =>
    iso
      ? new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.es, {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(iso))
      : "";

  function restoreFromBackup(b) {
    setActiveRanges((b.activeRanges || []).map((r) => ({ id: uid(), start: r.start || "", end: r.end || "" })));
    if (b.mode === "dates") {
      // The stashed exceptions are the picked dates — hydrate the calendar.
      setPickedDates(
        new Set((b.exceptions || []).filter((e) => e.kind === "open" && e.date).map((e) => e.date))
      );
      const first = (b.exceptions || []).find((e) => e.kind === "open" && e.start && e.end);
      if (first) {
        setPickStart(first.start);
        setPickEnd(first.end);
      }
      setExceptions([]);
    } else {
      setExceptions(
        (b.exceptions || []).map((e) => ({
          id: uid(),
          date: e.date || "",
          kind: e.kind || "block",
          start: e.start || "",
          end: e.end || "",
        }))
      );
    }
    setPublished(
      (b.published || []).map((p) => {
        const d = new Date(p.start);
        const ok = !Number.isNaN(d.getTime());
        const pad = (n) => String(n).padStart(2, "0");
        return {
          id: uid(),
          date: ok ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "",
          time: ok ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "",
          durationMin: Number.isFinite(p.durationMin) ? p.durationMin : 30,
        };
      })
    );
    if (b.mode) setMode(b.mode);
  }

  function goStandard() {
    // Stash the current advanced config so Standard never silently loses it.
    setCustomBackup({
      activeRanges: builtAvailability.activeRanges,
      exceptions: builtAvailability.exceptions,
      published: builtAvailability.published,
      mode: builtAvailability.mode,
    });
    setPreset("standard");
    touch();
  }

  function goCustom() {
    const empty =
      !activeRanges.some((r) => r.start) &&
      !exceptions.some((e) => e.date) &&
      !published.some((p) => p.date) &&
      pickedDates.size === 0;
    if (customBackup && empty) restoreFromBackup(customBackup);
    setPreset("custom");
    touch();
  }

  async function save() {
    if (!clinic) return;
    setSaving(true);
    setError("");
    try {
      if (isLocation) {
        const res = await saveLocation(clinic.id, {
          ...target.location,
          availability: builtAvailability,
        });
        if (!res?.ok) throw new Error(res?.error || "error");
        await reloadLocations?.();
      } else {
        await updateClinic(clinic.id, {
          profile: { ...(clinic.profile || {}), availability: builtAvailability },
        });
        await refreshClinic?.();
      }
      setSaved(true);
      setSavedTick((n) => n + 1);
      setDirty(false);
    } catch (err) {
      console.error("Could not save availability:", err);
      setError(t("avail.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // Switching the edit target discards in-memory edits (the editor remounts);
  // confirm if there are unsaved changes.
  function changeTarget(id) {
    if (id === targetId) return;
    if (dirty && !window.confirm(t("avail.switchConfirm"))) return;
    onTargetChange?.(id);
  }

  if (!clinic) return null;

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("avail.title")}
        </h1>
        <p className="text-sm text-slate-500">{t("avail.subtitle")}</p>
      </div>

      {locations.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Building2 size={16} className="text-brand-600 dark:text-brand-300" /> {t("avail.editingFor")}
          </span>
          <select
            className="input w-auto min-w-[12rem]"
            value={targetId}
            onChange={(e) => changeTarget(e.target.value)}
          >
            <option value="clinic">{t("avail.targetClinic")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || t("loc.untitled")}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">{t("avail.targetHint")}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} /> {t("avail.warnTitle")}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-7 text-sm text-amber-700 dark:text-amber-300/90">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Choose how you schedule */}
      <Section eyebrow={`${t("avail.step")} 1`} icon={Clock} title={t("avail.howTitle")} hint={t("avail.howHint")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={goStandard}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
              preset === "standard"
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30"
                : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
            }`}
          >
            <CalendarClock size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
            <span>
              <span className="block font-semibold text-slate-800 dark:text-slate-100">
                {t("avail.presetStandard")}
              </span>
              <span className="text-sm text-slate-500">{t("avail.presetStandardHint")}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={goCustom}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
              preset === "custom"
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30"
                : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
            }`}
          >
            <Wand2 size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
            <span>
              <span className="block font-semibold text-slate-800 dark:text-slate-100">
                {t("avail.presetCustom")}
              </span>
              <span className="text-sm text-slate-500">{t("avail.presetCustomHint")}</span>
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <label className="label mb-0">{t("avail.defaultLength")}</label>
          <input
            className="input w-28"
            type="number"
            min="5"
            step="5"
            value={slotMinutes}
            onChange={onNum(setSlotMinutes)}
          />
          <span className="text-sm text-slate-400">min</span>
        </div>
      </Section>

      {/* Standard view — open days + one shared time */}
      {preset === "standard" && (
        <Section eyebrow={`${t("avail.step")} 2`} icon={CalendarClock} title={t("avail.stdTitle")} hint={t("avail.stdHint")}>
          <p className="label">{t("avail.openDays")}</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map(({ idx, key }) => {
              const on = (weekly[idx] || []).length > 0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleStdDay(idx)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    on
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="label">{t("avail.from")}</label>
              <input
                type="time"
                className="input w-32"
                value={stdStart}
                onChange={(e) => setStdTime("start", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("avail.to")}</label>
              <input
                type="time"
                className="input w-32"
                value={stdEnd}
                onChange={(e) => setStdTime("end", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={stdLunch}
                onChange={(e) => setStdLunchOn(e.target.checked)}
              />
              {t("avail.lunchBreak")}
            </label>
            {stdLunch && (
              <div className="flex items-end gap-2">
                <input
                  type="time"
                  className="input w-28"
                  value={stdLunchStart}
                  onChange={(e) => setStdLunchTime("lunchStart", e.target.value)}
                />
                <span className="pb-2.5 text-slate-400">–</span>
                <input
                  type="time"
                  className="input w-28"
                  value={stdLunchEnd}
                  onChange={(e) => setStdLunchTime("lunchEnd", e.target.value)}
                />
              </div>
            )}
          </div>
          {stdLunch && (
            <p className="mt-2 text-xs text-slate-400">{t("avail.stdLunchHint")}</p>
          )}
          <p className="mt-4 text-sm text-slate-500">{t("avail.stdNote")}</p>
        </Section>
      )}

      {/* Custom view — choose repeating hours vs exact published times */}
      {preset === "custom" && (
        <Section eyebrow={`${t("avail.step")} 2`} icon={LayoutGrid} title={t("avail.modeTitle")} hint={t("avail.modeHint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setMode("windows");
                touch();
              }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                mode === "windows"
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30"
                  : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
              }`}
            >
              <LayoutGrid size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-100">
                  {t("avail.modeWindows")}
                </span>
                <span className="text-sm text-slate-500">{t("avail.modeWindowsHint")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("dates");
                touch();
              }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                mode === "dates"
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30"
                  : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
              }`}
            >
              <CalendarCheck size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-100">
                  {t("avail.modeDates")}
                </span>
                <span className="text-sm text-slate-500">{t("avail.modeDatesHint")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("published");
                touch();
              }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                mode === "published"
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30"
                  : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
              }`}
            >
              <ListChecks size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-100">
                  {t("avail.modePublished")}
                </span>
                <span className="text-sm text-slate-500">{t("avail.modePublishedHint")}</span>
              </span>
            </button>
          </div>
        </Section>
      )}

      {/* Pick-my-dates calendar — everything closed except tapped days */}
      {preset === "custom" && mode === "dates" && (
        <Section
          icon={CalendarCheck}
          title={t("avail.pickTitle")}
          hint={t("avail.pickHint")}
          right={
            pickedDates.size > 0 && (
              <button type="button" onClick={clearPicked} className="btn-ghost text-sm text-rose-600">
                <Trash2 size={14} /> {t("avail.pickClear")}
              </button>
            )
          }
        >
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="btn-ghost" aria-label="‹">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <select
                  className="input w-auto py-1.5 font-semibold capitalize"
                  value={calCursor.m}
                  onChange={(e) =>
                    setCalCursor((c) => ({ ...c, m: parseInt(e.target.value, 10) }))
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i} className="capitalize">
                      {new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.es, {
                        month: "long",
                      }).format(new Date(2000, i, 1))}
                    </option>
                  ))}
                </select>
                <select
                  className="input w-auto py-1.5 font-semibold"
                  value={calCursor.y}
                  onChange={(e) =>
                    setCalCursor((c) => ({ ...c, y: parseInt(e.target.value, 10) }))
                  }
                >
                  {[...new Set([calCursor.y, ...Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i)])]
                    .sort((a, b) => a - b)
                    .map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                </select>
              </div>
              <button type="button" onClick={() => moveMonth(1)} className="btn-ghost" aria-label="›">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW.map((k) => (
                <span key={k} className="py-1 text-[11px] font-semibold uppercase text-slate-400">
                  {t(k)}
                </span>
              ))}
              {monthMatrix(calCursor.y, calCursor.m)
                .flat()
                .map((d) => {
                  const dk = dateKey(d);
                  const todayK = dateKey(new Date());
                  const inMonth = d.getMonth() === calCursor.m;
                  const past = dk < todayK;
                  const on = pickedDates.has(dk);
                  return (
                    <button
                      key={dk}
                      type="button"
                      disabled={past}
                      onClick={() => toggleDate(dk)}
                      className={`aspect-square rounded-lg text-sm font-medium transition ${
                        on
                          ? "bg-brand-600 text-white shadow-sm"
                          : past
                          ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                          : inMonth
                          ? "text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-brand-900/30"
                          : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      } ${dk === todayK && !on ? "ring-1 ring-inset ring-brand-300" : ""}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              {t("avail.pickCount", { n: pickedDates.size })}
            </p>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="label">{t("avail.pickHours")}</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">{t("avail.from")}</label>
                <input
                  type="time"
                  className="input w-32"
                  value={pickStart}
                  onChange={(e) => {
                    setPickStart(e.target.value);
                    touch();
                  }}
                />
              </div>
              <div>
                <label className="label">{t("avail.to")}</label>
                <input
                  type="time"
                  className="input w-32"
                  value={pickEnd}
                  onChange={(e) => {
                    setPickEnd(e.target.value);
                    touch();
                  }}
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">{t("avail.pickNote")}</p>
          </div>
        </Section>
      )}

      {/* Quick setup — fill the whole week at once */}
      {preset === "custom" && mode === "windows" && (
        <Collapsible icon={Wand2} title={t("avail.quickTitle")} hint={t("avail.quickHint")}>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map(({ idx, key }) => {
              const on = qsDays.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleQsDay(idx)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    on
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="label">{t("avail.from")}</label>
              <input
                type="time"
                className="input w-32"
                value={qsStart}
                onChange={(e) => setQsStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("avail.to")}</label>
              <input
                type="time"
                className="input w-32"
                value={qsEnd}
                onChange={(e) => setQsEnd(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={qsLunch}
                onChange={(e) => setQsLunch(e.target.checked)}
              />
              {t("avail.lunchBreak")}
            </label>
            {qsLunch && (
              <div className="flex items-end gap-2">
                <input
                  type="time"
                  className="input w-28"
                  value={qsLunchStart}
                  onChange={(e) => setQsLunchStart(e.target.value)}
                />
                <span className="pb-2.5 text-slate-400">–</span>
                <input
                  type="time"
                  className="input w-28"
                  value={qsLunchEnd}
                  onChange={(e) => setQsLunchEnd(e.target.value)}
                />
              </div>
            )}
            <button type="button" onClick={applyQuickSetup} className="btn-primary">
              <Wand2 size={16} /> {t("avail.applyWeek")}
            </button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="label">{t("avail.presets")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3, 4, 5], "09:00", "17:00", false)}
                className="btn-outline text-sm"
              >
                {t("avail.presetWeekdays")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3, 4, 5], "09:00", "18:00", true)}
                className="btn-outline text-sm"
              >
                {t("avail.presetWeekdaysLunch")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3, 4, 5, 6], "08:00", "18:00", true)}
                className="btn-outline text-sm"
              >
                {t("avail.presetMonSat")}
              </button>
            </div>
          </div>
        </Collapsible>
      )}

      {/* Weekly windows */}
      {preset === "custom" && mode === "windows" && (
        <Section icon={CalendarClock} title={t("avail.weeklyTitle")} hint={t("avail.weeklyHint")}>
          <div className="space-y-3">
            {WEEK.map(({ idx, key }) => {
              const wins = weekly[idx] || [];
              const open = wins.length > 0;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                        checked={open}
                        onChange={() => toggleDay(idx)}
                      />
                      {t(key)}
                    </label>
                    {open ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyDayToAll(idx)}
                          className="btn-ghost text-xs text-slate-500"
                          title={t("avail.copyToAll")}
                        >
                          <Copy size={14} /> {t("avail.copyToAll")}
                        </button>
                        <button
                          type="button"
                          onClick={() => addWindow(idx)}
                          className="btn-ghost text-xs text-brand-600 dark:text-brand-300"
                        >
                          <Plus size={14} /> {t("avail.addWindow")}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">{t("avail.closed")}</span>
                    )}
                  </div>
                  {open && (
                    <div className="mt-3 space-y-2">
                      {wins.map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="time"
                            className="input w-32"
                            value={w.start}
                            onChange={(e) => setWindow(idx, i, "start", e.target.value)}
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            className="input w-32"
                            value={w.end}
                            onChange={(e) => setWindow(idx, i, "end", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeWindow(idx, i)}
                            className="btn-ghost shrink-0 text-rose-600"
                            title={t("avail.remove")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Active date ranges — for doctors who work in bursts */}
      {preset === "custom" && mode === "windows" && (
        <Collapsible
          icon={CalendarRange}
          title={t("avail.rangesTitle")}
          hint={t("avail.rangesHint")}
        >
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={addRange} className="btn-outline text-sm">
              <Plus size={16} /> {t("avail.addRange")}
            </button>
          </div>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="label flex items-center gap-1.5">
              <Repeat size={14} /> {t("avail.recTitle")}
            </p>
            <p className="mb-3 text-xs text-slate-500">{t("avail.recHint")}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">{t("avail.recStart")}</label>
                <input
                  type="date"
                  className="input w-44"
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("avail.recDays")}</label>
                <input
                  type="number"
                  min="1"
                  className="input w-20"
                  value={recDays}
                  onChange={onNum(setRecDays)}
                />
              </div>
              <div>
                <label className="label">{t("avail.recEvery")}</label>
                <select
                  className="input w-36"
                  value={recEvery}
                  onChange={(e) => setRecEvery(e.target.value)}
                >
                  <option value="month">{t("avail.recMonth")}</option>
                  <option value="2weeks">{t("avail.rec2weeks")}</option>
                  <option value="4weeks">{t("avail.rec4weeks")}</option>
                  <option value="week">{t("avail.recWeek")}</option>
                </select>
              </div>
              <div>
                <label className="label">{t("avail.recCount")}</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  className="input w-20"
                  value={recCount}
                  onChange={onNum(setRecCount)}
                />
              </div>
              <button type="button" onClick={generateRanges} className="btn-primary">
                <Repeat size={16} /> {t("avail.recGenerate")}
              </button>
            </div>
          </div>

          {activeRanges.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/50">
              {t("avail.rangesEmpty")}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{t("avail.rangesActiveNote")}</p>
              {activeRanges.map((r, i) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2.5 dark:border-brand-900/50 dark:bg-brand-900/10"
                >
                  <CalendarRange size={15} className="shrink-0 text-brand-600 dark:text-brand-300" />
                  <input
                    type="date"
                    className="input w-44"
                    value={r.start}
                    onChange={(e) => setRange(i, "start", e.target.value)}
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="date"
                    className="input w-44"
                    value={r.end}
                    min={r.start || undefined}
                    onChange={(e) => setRange(i, "end", e.target.value)}
                  />
                  <span className="text-xs text-slate-400">{t("avail.rangeEndHint")}</span>
                  <button
                    type="button"
                    onClick={() => removeRange(i)}
                    className="btn-ghost ml-auto shrink-0 text-rose-600"
                    title={t("avail.remove")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Collapsible>
      )}

      {/* Published exact times */}
      {preset === "custom" && mode === "published" && (
        <Section
          icon={ListChecks}
          title={t("avail.publishedTitle")}
          hint={t("avail.publishedHint")}
          right={
            <button type="button" onClick={addPublished} className="btn-outline text-sm">
              <Plus size={16} /> {t("avail.addTime")}
            </button>
          }
        >
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="label flex items-center gap-1.5">
              <Wand2 size={14} /> {t("avail.genTitle")}
            </p>
            <p className="mb-3 text-xs text-slate-500">{t("avail.genHint")}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">{t("avail.date")}</label>
                <input
                  type="date"
                  className="input w-44"
                  value={genDate}
                  onChange={(e) => setGenDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("avail.from")}</label>
                <input
                  type="time"
                  className="input w-28"
                  value={genStart}
                  onChange={(e) => setGenStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("avail.to")}</label>
                <input
                  type="time"
                  className="input w-28"
                  value={genEnd}
                  onChange={(e) => setGenEnd(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("avail.genEvery")}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    className="input w-24"
                    value={genEvery}
                    onChange={onNum(setGenEvery)}
                  />
                  <span className="text-xs text-slate-400">min</span>
                </div>
              </div>
              <button type="button" onClick={generatePublished} className="btn-primary">
                <Wand2 size={16} /> {t("avail.generate")}
              </button>
            </div>
          </div>

          {published.length === 0 ? (
            <p className="text-sm text-slate-500">{t("avail.publishedEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {published.map((p, i) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    className="input w-44"
                    value={p.date}
                    onChange={(e) => setPub(i, "date", e.target.value)}
                  />
                  <input
                    type="time"
                    className="input w-32"
                    value={p.time}
                    onChange={(e) => setPub(i, "time", e.target.value)}
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="input w-24"
                      value={p.durationMin}
                      onChange={(e) => setPub(i, "durationMin", parseInt(e.target.value, 10) || 30)}
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePub(i)}
                    className="btn-ghost shrink-0 text-rose-600"
                    title={t("avail.remove")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Booking rules — advanced, applies to both presets */}
      <Collapsible
        eyebrow={`${t("avail.step")} 3`}
        icon={Timer}
        title={t("avail.rulesTitle")}
        hint={t("avail.rulesHint")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label flex items-center gap-1.5">
              <Timer size={14} /> {t("avail.bufferLabel")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="5"
                className="input w-24"
                value={bufferMin}
                onChange={onNum(setBufferMin)}
              />
              <span className="text-sm text-slate-400">min</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t("avail.bufferHint")}</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Hourglass size={14} /> {t("avail.noticeLabel")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="1"
                className="input w-24"
                value={noticeHours}
                onChange={onNum(setNoticeHours)}
              />
              <span className="text-sm text-slate-400">{t("avail.hours")}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t("avail.noticeHint")}</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <CalendarDays size={14} /> {t("avail.horizonLabel")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="1"
                className="input w-24"
                value={horizonDays}
                onChange={onNum(setHorizonDays)}
              />
              <span className="text-sm text-slate-400">{t("avail.days")}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t("avail.horizonHint")}</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={14} /> {t("avail.capacityLabel")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="1"
                className="input w-24"
                value={capacity}
                onChange={onNum(setCapacity)}
              />
              <span className="text-sm text-slate-400">{t("avail.perSlot")}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t("avail.capacityHint")}</p>
          </div>
        </div>
      </Collapsible>

      {/* Time off & exceptions — vacations / closures + one-off overrides.
          Hidden in pick-my-dates mode: un-tapping a day is the way off. */}
      {!(preset === "custom" && mode === "dates") && (
      <Collapsible icon={Ban} title={t("avail.timeOffTitle")} hint={t("avail.timeOffHint")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{t("avail.offTitle")}</p>
            <p className="text-sm text-slate-500">{t("avail.offHint")}</p>
          </div>
          <button type="button" onClick={addOffRange} className="btn-outline shrink-0 text-sm">
            <Plus size={16} /> {t("avail.addDayOff")}
          </button>
        </div>
        {offRanges.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/50">
            {t("avail.offEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {offRanges.map((r, i) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-900/10"
              >
                <Ban size={15} className="shrink-0 text-rose-600" />
                <input
                  type="date"
                  className="input w-44"
                  value={r.start}
                  onChange={(e) => setOffRange(i, "start", e.target.value)}
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  className="input w-44"
                  value={r.end}
                  min={r.start || undefined}
                  onChange={(e) => setOffRange(i, "end", e.target.value)}
                />
                <span className="text-xs text-slate-400">{t("avail.rangeEndHint")}</span>
                <button
                  type="button"
                  onClick={() => removeOffRange(i)}
                  className="btn-ghost ml-auto shrink-0 text-rose-600"
                  title={t("avail.remove")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {preset === "custom" && (
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{t("avail.exTitle")}</p>
              <p className="text-sm text-slate-500">{t("avail.exHint")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => addException("block")} className="btn-outline text-sm">
                <Ban size={15} /> {t("avail.addBlock")}
              </button>
              <button type="button" onClick={() => addException("open")} className="btn-outline text-sm">
                <CalendarPlus size={15} /> {t("avail.addOpen")}
              </button>
            </div>
          </div>
          {exceptions.length === 0 ? (
          <p className="text-sm text-slate-500">{t("avail.exEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((e, i) => (
              <div
                key={e.id}
                className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 ${
                  e.kind === "open"
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10"
                    : "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-900/10"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                    e.kind === "open"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                  }`}
                >
                  {e.kind === "open" ? <CalendarPlus size={12} /> : <Ban size={12} />}
                  {e.kind === "open" ? t("avail.open") : t("avail.block")}
                </span>
                <input
                  type="date"
                  className="input w-44"
                  value={e.date}
                  onChange={(ev) => setException(i, "date", ev.target.value)}
                />
                <input
                  type="time"
                  className="input w-32"
                  value={e.start || ""}
                  onChange={(ev) => setException(i, "start", ev.target.value)}
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  className="input w-32"
                  value={e.end || ""}
                  onChange={(ev) => setException(i, "end", ev.target.value)}
                />
                {e.kind === "block" && (
                  <span className="text-xs text-slate-400">{t("avail.blockAllDayHint")}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeException(i)}
                  className="btn-ghost ml-auto shrink-0 text-rose-600"
                  title={t("avail.remove")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
        )}
      </Collapsible>
      )}

      {/* Live patient-facing preview */}
      <Section icon={Eye} title={t("avail.previewTitle")} hint={t("avail.previewHint")}>
        {preview.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:bg-slate-800/50">
            {t("avail.previewEmpty")}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {preview.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 dark:border-slate-700"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
                    {fmtPreviewDay(d.date)}
                  </p>
                  {d.count > 0 && (
                    <p className="truncate text-xs text-slate-400">
                      {fmtPreviewTime(d.first)} – {fmtPreviewTime(d.last)}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    d.count > 0
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                  }`}
                >
                  {t("avail.previewSlots", { n: d.count })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 md:pl-64">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-sm text-slate-500">{summary}</span>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-rose-600">{error}</span>}
            {saved && !error && !dirty && (
              <span
                key={savedTick}
                className="animate-saved-pop inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Check size={13} strokeWidth={3} />
                </span>
                {t("avail.saved")}
              </span>
            )}
            {dirty && !error && (
              <span className="text-sm text-amber-600">{t("avail.unsaved")}</span>
            )}
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {t("avail.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
