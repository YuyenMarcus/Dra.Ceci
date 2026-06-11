import { parsePhoneNumberFromString } from "libphonenumber-js";

// Current locale, kept in sync by the language provider via setLocale().
let currentLang = "es";
const LOCALES = { es: "es-ES", en: "en-US" };

export function setLocale(lang) {
  currentLang = lang === "en" ? "en" : "es";
}

function locale() {
  return LOCALES[currentLang] ?? LOCALES.es;
}

const RELATIVE_WORDS = {
  es: {
    today: "Hoy",
    tomorrow: "Mañana",
    yesterday: "Ayer",
    inDays: (n) => `En ${n} días`,
    daysAgo: (n) => `Hace ${n} días`,
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    inDays: (n) => `In ${n} days`,
    daysAgo: (n) => `${n} days ago`,
  },
};

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(locale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Friendly full date, e.g. "sábado, 30 de mayo" / "Saturday, May 30".
export function formatLongDate(iso = new Date().toISOString()) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(locale(), {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDay(iso) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(d) - startOfDay(now)) / 86400000
  );
  const w = RELATIVE_WORDS[currentLang] ?? RELATIVE_WORDS.es;
  if (diffDays === 0) return w.today;
  if (diffDays === 1) return w.tomorrow;
  if (diffDays === -1) return w.yesterday;
  if (diffDays > 1 && diffDays < 7) return w.inDays(diffDays);
  if (diffDays < 0) return w.daysAgo(Math.abs(diffDays));
  return formatDate(iso);
}

// Convert an ISO string into the value a <input type="datetime-local"> expects.
export function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Reduce a phone number to its digits for reliable comparison.
export function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

// Pretty international phone, e.g. "+502 1234 5678". Falls back to the raw
// value (with a leading +) when it can't be parsed, so we never lose the
// country code the user entered.
export function formatPhoneIntl(phone = "") {
  const raw = String(phone).trim();
  if (!raw) return "";
  const pn = parsePhoneNumberFromString(raw.startsWith("+") ? raw : `+${raw}`);
  return pn ? pn.formatInternational() : raw;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// Deterministic pastel avatar color from a name.
export function avatarColor(name = "") {
  const palette = [
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-teal-100 text-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + (hash << 5) - hash;
  return palette[Math.abs(hash) % palette.length];
}
