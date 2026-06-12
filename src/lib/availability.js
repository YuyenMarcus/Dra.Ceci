// Helpers for computing a doctor's bookable time slots without ever
// double-booking an existing appointment.
//
// A clinic/branch ("source") can define availability in two ways:
//
//   1. Legacy/simple: source.workingDays + startHour/endHour + slotMinutes.
//      One continuous open window per working day.
//
//   2. Rich config in source.availability:
//        {
//          mode: "windows" | "published",   // default "windows"
//          slotMinutes: 30,                  // default appointment length
//          weekly: {                         // 0=Sun .. 6=Sat
//            "1": [{ start: "09:00", end: "12:00" },
//                  { start: "14:00", end: "17:00" }],   // split shift + lunch
//          },
//          exceptions: [
//            { date: "2026-06-20", kind: "block" },                 // whole day off
//            { date: "2026-06-20", kind: "block",
//              start: "12:00", end: "13:00" },                      // partial block
//            { date: "2026-06-21", kind: "open",
//              start: "19:00", end: "20:00" },                      // one-off opening
//          ],
//          published: [                       // used only when mode === "published"
//            { start: "2026-06-21T19:00", durationMin: 30 },
//          ],
//        }
//
// The whole engine degrades gracefully: when no rich config is present it
// behaves exactly like the original simple model.

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_MS = 24 * 60;

export function appointmentEnd(appt) {
  return new Date(appt.start).getTime() + (appt.durationMin || 30) * 60000;
}

// Does [startMs, endMs) overlap a scheduled appointment for this doctor?
export function hasConflict(appointments, doctorId, startMs, endMs, ignoreId) {
  return appointments.some((a) => {
    if (a.doctorId !== doctorId) return false;
    if (a.status !== "scheduled") return false;
    if (ignoreId && a.id === ignoreId) return false;
    const aStart = new Date(a.start).getTime();
    const aEnd = appointmentEnd(a);
    return aStart < endMs && startMs < aEnd;
  });
}

// How many scheduled appointments overlap [startMs, endMs) for this doctor?
// Used for capacity (multiple chairs / concurrent bookings per slot).
export function concurrentCount(appointments, doctorId, startMs, endMs, ignoreId) {
  let n = 0;
  for (const a of appointments) {
    if (a.doctorId !== doctorId) continue;
    if (a.status !== "scheduled") continue;
    if (ignoreId && a.id === ignoreId) continue;
    const aStart = new Date(a.start).getTime();
    const aEnd = appointmentEnd(a);
    if (aStart < endMs && startMs < aEnd) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function hmToMin(hm) {
  if (typeof hm !== "string") return null;
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export function minToHm(min) {
  const m = Math.max(0, Math.round(min));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// Merge overlapping/adjacent windows and sort by start.
function mergeWindows(windows) {
  const sorted = windows
    .filter((w) => w && Number.isFinite(w.s) && Number.isFinite(w.e) && w.e > w.s)
    .sort((a, b) => a.s - b.s);
  const out = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.s <= last.e) {
      last.e = Math.max(last.e, w.e);
    } else {
      out.push({ s: w.s, e: w.e });
    }
  }
  return out;
}

// Remove [bs, be) from each window, possibly splitting it in two.
function subtractRange(windows, bs, be) {
  const out = [];
  for (const w of windows) {
    if (be <= w.s || bs >= w.e) {
      out.push(w);
      continue;
    }
    if (bs > w.s) out.push({ s: w.s, e: Math.min(bs, w.e) });
    if (be < w.e) out.push({ s: Math.max(be, w.s), e: w.e });
  }
  return out.filter((w) => w.e > w.s);
}

function getConfig(source) {
  const av = source?.availability;
  if (!av || typeof av !== "object") return null;
  return av;
}

// Is a "YYYY-MM-DD" key inside at least one active range? ISO date strings sort
// lexicographically, so plain string comparison is correct here.
function withinActiveRanges(ranges, dk) {
  return ranges.some((r) => {
    if (!r || !r.start) return false;
    const end = r.end || r.start;
    return dk >= r.start && dk <= end;
  });
}

// Open windows (in minutes-from-midnight) for a given Date, taking the rich
// weekly config + same-day exceptions into account. Returns [] for closed days.
// Not used for "published" mode.
export function dayAvailability(source, date) {
  if (!source) return [];
  const av = getConfig(source);
  const wd = date.getDay();
  const dk = dateKey(date);

  let windows = [];

  if (av && av.weekly && typeof av.weekly === "object") {
    const list = av.weekly[String(wd)] || av.weekly[wd] || [];
    windows = (Array.isArray(list) ? list : [])
      .map((w) => ({ s: hmToMin(w.start), e: hmToMin(w.end) }))
      .filter((w) => Number.isFinite(w.s) && Number.isFinite(w.e));
  } else {
    // Legacy single-window fallback.
    const workingDays = source.workingDays || [];
    if (workingDays.includes(wd)) {
      const sh = Number.isFinite(source.startHour) ? source.startHour : 9;
      const eh = Number.isFinite(source.endHour) ? source.endHour : 17;
      windows = [{ s: sh * 60, e: eh * 60 }];
    }
  }

  // "Active date ranges" gate the recurring weekly pattern: when any ranges are
  // defined, the weekly windows only apply on dates that fall inside a range
  // (e.g. a dentist who works 7 days once a month). One-off "open" exceptions
  // below still apply regardless, so they remain absolute overrides.
  if (av && Array.isArray(av.activeRanges) && av.activeRanges.length) {
    if (!withinActiveRanges(av.activeRanges, dk)) windows = [];
  }

  // "Days off" ranges close whole days (e.g. vacations) in any mode. A one-off
  // "open" exception below can still re-open a specific time if needed.
  if (av && Array.isArray(av.offRanges) && av.offRanges.length) {
    if (withinActiveRanges(av.offRanges, dk)) windows = [];
  }

  if (av && Array.isArray(av.exceptions)) {
    for (const ex of av.exceptions) {
      if (!ex || ex.date !== dk) continue;
      if (ex.kind === "open") {
        const s = hmToMin(ex.start);
        const e = hmToMin(ex.end);
        if (Number.isFinite(s) && Number.isFinite(e)) windows.push({ s, e });
      } else if (ex.kind === "block") {
        const bs = ex.start ? hmToMin(ex.start) : 0;
        const be = ex.end ? hmToMin(ex.end) : DAY_MS;
        windows = subtractRange(windows, bs ?? 0, be ?? DAY_MS);
      }
    }
  }

  return mergeWindows(windows);
}

export function isPublishedMode(source) {
  const av = getConfig(source);
  return !!(av && av.mode === "published");
}

function getCapacity(av) {
  return av && Number.isFinite(av.capacity) && av.capacity > 0 ? av.capacity : 1;
}

function getNoticeMs(av) {
  return av && Number.isFinite(av.minNoticeMin) && av.minNoticeMin > 0
    ? av.minNoticeMin * 60000
    : 0;
}

function publishedSlotsForDate(source, dateStr, appointments, fallbackStep) {
  const av = getConfig(source);
  const list = Array.isArray(av?.published) ? av.published : [];
  const now = Date.now();
  const capacity = getCapacity(av);
  const noticeMs = getNoticeMs(av);
  const slots = [];
  for (const p of list) {
    if (!p || !p.start) continue;
    const start = new Date(p.start);
    if (Number.isNaN(start.getTime())) continue;
    if (dateKey(start) !== dateStr) continue;
    const step = Number.isFinite(p.durationMin) ? p.durationMin : fallbackStep;
    const startMs = start.getTime();
    const endMs = startMs + step * 60000;
    const past = startMs < now;
    const tooSoon = startMs < now + noticeMs;
    const taken = concurrentCount(appointments, source.id, startMs, endMs) >= capacity;
    slots.push({
      start: start.toISOString(),
      startMs,
      durationMin: step,
      past,
      taken,
      available: !tooSoon && !taken,
    });
  }
  return slots.sort((a, b) => a.startMs - b.startMs);
}

function defaultStep(source) {
  const av = getConfig(source);
  if (av && Number.isFinite(av.slotMinutes)) return av.slotMinutes;
  if (Number.isFinite(source?.slotMinutes)) return source.slotMinutes;
  return 30;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isWorkingDay(source, date) {
  if (!source) return false;
  if (isPublishedMode(source)) {
    const av = getConfig(source);
    const dk = dateKey(date);
    const now = Date.now();
    return (av.published || []).some((p) => {
      if (!p || !p.start) return false;
      const d = new Date(p.start);
      return (
        !Number.isNaN(d.getTime()) &&
        dateKey(d) === dk &&
        d.getTime() >= now - DAY_MS * 60000
      );
    });
  }
  // No rich config: keep the original behaviour exactly.
  if (!getConfig(source)) {
    const days = source.workingDays || [];
    return days.includes(date.getDay());
  }
  return dayAvailability(source, date).length > 0;
}

// Build a "YYYY-MM-DD" key in local time.
export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function dayLabel(date) {
  return DAY_NAMES[date.getDay()];
}

// Generate every slot for a doctor on a given day, flagging whether each is
// taken or in the past. `dateStr` is "YYYY-MM-DD". `durationMin` overrides the
// configured slot length (used for per-service durations).
export function generateSlots(source, dateStr, appointments, durationMin) {
  if (!source) return [];

  const step =
    Number.isFinite(durationMin) && durationMin > 0
      ? durationMin
      : defaultStep(source);

  if (isPublishedMode(source)) {
    return publishedSlotsForDate(source, dateStr, appointments, step);
  }

  const day = new Date(`${dateStr}T00:00:00`);
  const windows = dayAvailability(source, day);
  if (!windows.length) return [];

  const av = getConfig(source);
  const buffer = av && Number.isFinite(av.bufferMin) && av.bufferMin > 0 ? av.bufferMin : 0;
  const stride = step + buffer; // advance past the visit + cleanup gap
  const capacity = getCapacity(av);
  const noticeMs = getNoticeMs(av);

  const slots = [];
  const now = Date.now();

  for (const w of windows) {
    for (let minutes = w.s; minutes + step <= w.e; minutes += stride) {
      const start = new Date(day);
      start.setHours(0, minutes, 0, 0);
      const startMs = start.getTime();
      const endMs = startMs + step * 60000;

      const past = startMs < now;
      const tooSoon = startMs < now + noticeMs;
      const taken = concurrentCount(appointments, source.id, startMs, endMs) >= capacity;

      slots.push({
        start: start.toISOString(),
        startMs,
        durationMin: step,
        past,
        taken,
        available: !tooSoon && !taken,
      });
    }
  }
  return slots;
}

// Build a calendar matrix (weeks × 7 days) for the given month. Each cell is a
// Date, including leading/trailing days from adjacent months so the grid is
// always rectangular. Weeks start on Sunday to match getDay()/workingDays.
export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop once we've passed the month and completed a full week.
    if (cursor.getMonth() !== month && week[6].getMonth() !== month) break;
  }
  return weeks;
}

// The next N working days starting from `from` (inclusive).
export function upcomingWorkingDays(source, count = 14, from = new Date()) {
  const days = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  // Allow scanning far enough ahead to collect `count` working days even when
  // the doctor only works a couple of days per week.
  const guardLimit = count * 7 + 60;
  let guard = 0;
  while (days.length < count && guard < guardLimit) {
    if (isWorkingDay(source, cursor)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}
