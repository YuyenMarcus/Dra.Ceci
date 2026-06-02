// Structure + helpers for the dental patient "ficha" (clinical record),
// modeled on the clinic's paper intake form. Clinical labels stay in Spanish
// to match the form patients and staff already know.

// Revisión por sistemas. `hint` expands the abbreviation where it is standard.
export const SISTEMAS = [
  { key: "snc", label: "SNC", hint: "Sistema Nervioso Central" },
  { key: "sh", label: "SH", hint: "Sistema Hematológico" },
  { key: "scv", label: "SCV", hint: "Sistema Cardiovascular" },
  { key: "sme", label: "SME", hint: "Sistema Músculo-Esquelético" },
  { key: "sci", label: "SCI", hint: "" },
  { key: "si", label: "SI", hint: "" },
  { key: "se", label: "SE", hint: "" },
  { key: "sr", label: "SR", hint: "Sistema Respiratorio" },
  { key: "sgu", label: "SGU", hint: "Sistema Genitourinario" },
  { key: "otros", label: "OTROS", hint: "" },
];

export function emptySistemas() {
  return SISTEMAS.reduce((acc, s) => ({ ...acc, [s.key]: "" }), {});
}

// Odontograma (dental chart) using FDI two-digit notation. Rows are laid out as
// they appear clinically: upper arch (right → left) and lower arch (right → left).
export const TEETH_UPPER = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const TEETH_LOWER = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

// Primary (deciduous) teeth — "dientes temporales". FDI notation, laid out in
// the middle of the chart since a child's arch sits inside the adult arch.
export const TEETH_UPPER_PRIMARY = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const TEETH_LOWER_PRIMARY = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

// Per-tooth status. `none` is the default (healthy / unmarked).
export const ODONTO_STATUSES = [
  { key: "none", label: "Sano", abbr: "", swatch: "bg-white border-slate-300" },
  { key: "caries", label: "Caries", abbr: "C", swatch: "bg-rose-500 border-rose-600 text-white" },
  { key: "obturado", label: "Obturado", abbr: "O", swatch: "bg-sky-500 border-sky-600 text-white" },
  { key: "corona", label: "Corona", abbr: "Co", swatch: "bg-amber-400 border-amber-500 text-white" },
  { key: "ausente", label: "Ausente", abbr: "A", swatch: "bg-slate-300 border-slate-400 text-slate-600 line-through" },
  { key: "extraccion", label: "Extracción indicada", abbr: "Ext", swatch: "bg-fuchsia-500 border-fuchsia-600 text-white" },
];

export function odontoStatus(key) {
  return ODONTO_STATUSES.find((s) => s.key === key) ?? ODONTO_STATUSES[0];
}

// The status that follows `key` when cycling through options (used for quick
// click-to-mark editing).
export function nextOdontoStatus(key) {
  const idx = ODONTO_STATUSES.findIndex((s) => s.key === key);
  const next = ODONTO_STATUSES[(idx + 1) % ODONTO_STATUSES.length];
  return next.key;
}

// A fresh, fully-shaped ficha. Spread an existing client over the defaults so
// older records (without the new fields) still render and edit cleanly.
export function normalizeFicha(client = {}) {
  return {
    name: "",
    email: "",
    phone: "",
    dob: "",
    // Datos del paciente
    ocupacion: "",
    direccion: "",
    sexo: "",
    referidoPor: "",
    enfermedades: "",
    // Historia clínica
    historiaOdontologica: "",
    hospitalizaciones: "",
    medicamentoCabecera: "",
    // Plan
    planTratamiento: "",
    odontogramaNotas: "",
    ...client,
    sistemas: { ...emptySistemas(), ...(client.sistemas || {}) },
    odontograma:
      client.odontograma && typeof client.odontograma === "object"
        ? { ...client.odontograma }
        : {},
  };
}

export function calcEdad(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
