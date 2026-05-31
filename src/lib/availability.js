// Helpers for computing a doctor's bookable time slots without ever
// double-booking an existing appointment.

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

export function isWorkingDay(doctor, date) {
  return doctor.workingDays.includes(date.getDay());
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
// taken or in the past. `dateStr` is "YYYY-MM-DD".
export function generateSlots(doctor, dateStr, appointments) {
  if (!doctor) return [];
  const day = new Date(`${dateStr}T00:00:00`);
  if (!isWorkingDay(doctor, day)) return [];

  const slots = [];
  const step = doctor.slotMinutes;
  const now = Date.now();

  for (
    let minutes = doctor.startHour * 60;
    minutes + step <= doctor.endHour * 60;
    minutes += step
  ) {
    const start = new Date(day);
    start.setHours(0, minutes, 0, 0);
    const startMs = start.getTime();
    const endMs = startMs + step * 60000;

    const past = startMs < now;
    const taken = hasConflict(appointments, doctor.id, startMs, endMs);

    slots.push({
      start: start.toISOString(),
      startMs,
      durationMin: step,
      past,
      taken,
      available: !past && !taken,
    });
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
export function upcomingWorkingDays(doctor, count = 14, from = new Date()) {
  const days = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  // Allow scanning far enough ahead to collect `count` working days even when
  // the doctor only works a couple of days per week.
  const guardLimit = count * 7 + 14;
  let guard = 0;
  while (days.length < count && guard < guardLimit) {
    if (isWorkingDay(doctor, cursor)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}
