// Plain-language labels for FDI tooth numbers (patient-facing timeline).

const QUADRANT = {
  1: { es: "superior derecho", en: "upper right" },
  2: { es: "superior izquierdo", en: "upper left" },
  3: { es: "inferior izquierdo", en: "lower left" },
  4: { es: "inferior derecho", en: "lower right" },
  5: { es: "superior derecho (temporal)", en: "upper right (primary)" },
  6: { es: "superior izquierdo (temporal)", en: "upper left (primary)" },
  7: { es: "inferior izquierdo (temporal)", en: "lower left (primary)" },
  8: { es: "inferior derecho (temporal)", en: "lower right (primary)" },
};

const POSITION = {
  1: { es: "incisivo central", en: "central incisor" },
  2: { es: "incisivo lateral", en: "lateral incisor" },
  3: { es: "canino", en: "canine" },
  4: { es: "premolar", en: "premolar" },
  5: { es: "molar", en: "molar" },
  6: { es: "molar", en: "molar" },
  7: { es: "molar", en: "molar" },
  8: { es: "molar", en: "molar" },
};

export function toothLabel(fdi, lang = "es") {
  if (!fdi) return "";
  const s = String(fdi).trim();
  if (!/^\d{2}$/.test(s)) return s;
  const q = Number(s[0]);
  const p = Number(s[1]);
  const quad = QUADRANT[q];
  const pos = POSITION[p];
  if (!quad || !pos) return `FDI ${s}`;
  const l = lang === "en" ? "en" : "es";
  return `${pos[l]}, ${quad[l]} (${s})`;
}

export const TOOTH_OPTIONS = [
  ...[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  ...[55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  ...[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  ...[85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
].map(String);
