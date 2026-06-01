// Common dental procedures for the treatment log dropdown (Spanish-first labels).

export const PROCEDURES = [
  { key: "cleaning", es: "Limpieza dental", en: "Dental cleaning" },
  { key: "checkup", es: "Consulta / revisión", en: "Check-up / exam" },
  { key: "filling", es: "Obturación (resina)", en: "Composite filling" },
  { key: "extraction", es: "Extracción", en: "Extraction" },
  { key: "root_canal", es: "Endodoncia", en: "Root canal" },
  { key: "crown", es: "Corona", en: "Crown" },
  { key: "whitening", es: "Blanqueamiento", en: "Teeth whitening" },
  { key: "scaling", es: "Raspado y alisado", en: "Scaling & root planing" },
  { key: "implant", es: "Implante dental", en: "Dental implant" },
  { key: "ortho_adjust", es: "Ajuste de ortodoncia", en: "Orthodontic adjustment" },
  { key: "xray", es: "Radiografía", en: "X-ray" },
  { key: "other", es: "Otro (especificar)", en: "Other (specify)" },
];

export function procedureLabel(key, lang = "es", customText = "") {
  if (key === "custom" || key === "other") return customText || (lang === "en" ? "Other" : "Otro");
  const row = PROCEDURES.find((p) => p.key === key);
  if (!row) return customText || key;
  return lang === "en" ? row.en : row.es;
}

export const DEFAULT_CONSENT_BODY_ES = `He sido informado(a) sobre el procedimiento dental propuesto, sus beneficios, riesgos alternativas y cuidados posteriores. Autorizo al profesional de la salud a realizar el tratamiento acordado.

Entiendo que puedo hacer preguntas en cualquier momento y que el consentimiento puede retirarse antes del procedimiento.`;

export const DEFAULT_CONSENT_BODY_EN = `I have been informed about the proposed dental procedure, its benefits, risks, alternatives, and aftercare. I authorize the healthcare professional to perform the agreed treatment.

I understand I may ask questions at any time and may withdraw consent before the procedure.`;
