// ---------------------------------------------------------------------------
// Subscription tiers — single source of truth
//
// Each plan has:
//  - id / name / price: identity + pricing (USD/month)
//  - features: the human-readable bullet list shown on pricing/plan cards,
//    kept inline (es/en) since it's marketing copy rather than UI chrome
//  - capabilities: machine-readable flags used to gate features in the app.
//    Higher tiers inherit lower-tier capabilities (Profesional includes
//    Starter; Hacienda-Ready includes everything in Profesional).
//
// To gate a feature anywhere in the app use the `can(capability)` helper from
// AuthContext (derived from the clinic's current plan), or hasCapability()
// here directly.
// ---------------------------------------------------------------------------

const starterCaps = {
  scheduling: true,
  maxDoctors: 2,
  queue: true,
  whatsappRemindersPerMonth: 100,
  patientRecords: "basic",
  freeTrial: true,
  emailSupport: true,
  storageGb: 1,
};

const profesionalCaps = {
  ...starterCaps,
  maxDoctors: Infinity,
  whatsappRemindersPerMonth: 500,
  patientRecords: "full",
  odontogram: true,
  treatmentPlans: true,
  budgeting: true,
  consent: true,
  prescriptions: true,
  inventoryDeductions: true,
  timeline: true,
  patientPortal: true,
  dashboardReports: true,
  commissionCalculator: true,
  storageGb: 10,
  prioritySupport: true,
};

const haciendaCaps = {
  ...profesionalCaps,
  dte: true,
  selloRecepcion: true,
  wompi: true,
  archive10yr: true,
  storageGb: Infinity,
  multiDoctorCommission: true,
  dedicatedOnboarding: true,
  whatsappRemindersPerMonth: Infinity,
};

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 25,
    capabilities: starterCaps,
    features: {
      es: [
        "Agenda (hasta 2 doctores)",
        "Sistema de turnos / cola",
        "Recordatorios por WhatsApp (100/mes)",
        "Fichas básicas de pacientes",
        "Prueba gratis de 14 días",
        "Soporte por email",
        "1 GB de almacenamiento de documentos",
      ],
      en: [
        "Scheduling (up to 2 doctors)",
        "Token / queue system",
        "WhatsApp reminders (100/month)",
        "Basic patient records",
        "14-day free trial",
        "Email support",
        "1GB document storage",
      ],
    },
  },
  {
    id: "profesional",
    name: "Profesional",
    price: 35,
    highlight: true,
    // Not purchasable yet — the tier's flagship features (odontogram plans,
    // budgeting, digital consent, WhatsApp OTP portal) are still being built.
    // Admins can still assign it manually from the console.
    comingSoon: true,
    capabilities: profesionalCaps,
    features: {
      es: [
        "Agenda (doctores ilimitados)",
        "Sistema de turnos / cola",
        "Ficha clínica completa",
        "Odontograma interactivo + planes de tratamiento",
        "Presupuestos ligados al tratamiento",
        "Consentimiento informado digital (cumple MINSAL)",
        "Generador de recetas PDF (campos CSSP/DCI)",
        "Inventario con descuento por tratamiento",
        "Línea de tiempo del paciente",
        "Portal del paciente con acceso por OTP de WhatsApp",
        "Recordatorios por WhatsApp (500/mes)",
        "Panel y reportes",
        "Calculadora de comisiones del doctor",
        "10 GB de almacenamiento de documentos",
        "Soporte prioritario",
      ],
      en: [
        "Scheduling (unlimited doctors)",
        "Token / queue system",
        "Full patient ficha",
        "Interactive odontogram + treatment plans",
        "Treatment-linked budgeting tool",
        "Digital informed consent (MINSAL compliant)",
        "Digital prescription PDF generator (CSSP/DCI fields)",
        "Inventory with treatment-linked deductions",
        "Patient treatment timeline",
        "Patient portal with WhatsApp OTP access",
        "WhatsApp reminders (500/month)",
        "Dashboard and reports",
        "Doctor commission calculator",
        "10GB document storage",
        "Priority support",
      ],
    },
  },
  {
    id: "hacienda",
    name: "Hacienda-Ready",
    price: 55,
    comingSoon: true,
    capabilities: haciendaCaps,
    features: {
      es: [
        "Todo lo de Profesional",
        "Pipeline DTE completo (JSON → firma digital → API Hacienda → UUID)",
        "Almacenamiento del Sello de Recepción",
        "Integración de enlaces de pago",
        "Archivo de documentos por 10 años (cumplimiento fiscal)",
        "Almacenamiento de documentos ilimitado",
        "Seguimiento de comisiones multi-doctor",
        "Onboarding dedicado",
        "Recordatorios por WhatsApp ilimitados",
      ],
      en: [
        "Everything in Profesional",
        "Full DTE pipeline (JSON → digital signature → Hacienda API → UUID)",
        "Sello de Recepción storage",
        "Payment link integration",
        "10-year document archive (fiscal compliance)",
        "Unlimited document storage",
        "Multi-doctor commission tracking",
        "Dedicated onboarding",
        "Unlimited WhatsApp reminders",
      ],
    },
  },
];

export const DEFAULT_PLAN_ID = "starter";

export function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

// Raw capability value for a plan (e.g. storageGb -> 10, maxDoctors -> Infinity).
export function capabilityValue(planId, capability) {
  return getPlan(planId).capabilities[capability];
}

// Truthy gate for a capability. Note `patientRecords` is a string ("basic" |
// "full"); callers that care about the level should use capabilityValue.
export function hasCapability(planId, capability) {
  return Boolean(capabilityValue(planId, capability));
}

export function planFeatures(planId, lang = "es") {
  const f = getPlan(planId).features;
  return f[lang] || f.es;
}
