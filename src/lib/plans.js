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
  multiLocation: true,
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
        "Reservas de citas en línea (hasta 2 doctores)",
        "Sala de espera con sistema de turnos",
        "Recordatorios automáticos de citas por WhatsApp (100/mes)",
        "Información básica e historial de visitas del paciente",
        "Prueba gratis de 14 días",
        "Soporte por email",
      ],
      en: [
        "Online appointment booking for up to 2 doctors",
        "Waiting room queue & patient turn system",
        "Automatic WhatsApp appointment reminders (100/month)",
        "Patient basic info and visit history",
        "14-day free trial",
        "Email support",
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
        "Todo lo de Starter",
        "Doctores ilimitados en una sola cuenta",
        "Ficha completa del paciente con historial médico",
        "Odontograma visual para planificar y dar seguimiento a tratamientos",
        "Estimación automática de costos por tratamiento",
        "Consentimientos digitales del paciente (requeridos por ley)",
        "Generador de recetas con todos los campos requeridos",
        "Inventario que se actualiza automáticamente después de cada procedimiento",
        "Los pacientes pueden ver su historial de tratamientos en línea",
        "Reportes mensuales y panel de la clínica",
        "Calculadora de ingresos del doctor",
      ],
      en: [
        "Everything in Starter",
        "Unlimited doctors on one account",
        "Complete patient file with full medical history",
        "Visual tooth map to plan and track treatments",
        "Automatic cost estimates for each treatment",
        "Digital patient consent forms (legally required)",
        "Prescription generator with all required fields",
        "Inventory that updates automatically after each procedure",
        "Patients can view their own treatment history online",
        "Monthly reports and clinic dashboard",
        "Doctor earnings calculator",
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
        "Facturación electrónica automática enviada a Hacienda en segundos",
        "Acepta pagos con tarjeta y envía enlaces de pago a los pacientes",
        "Todas las facturas y documentos guardados legalmente por 10 años",
        "Almacenamiento ilimitado de archivos para documentos y registros",
        "Soporte dedicado de configuración e instalación",
        "Recordatorios por WhatsApp ilimitados",
      ],
      en: [
        "Everything in Profesional",
        "Automatic electronic invoicing sent to Hacienda in seconds",
        "Accept card payments and send payment links to patients",
        "All invoices and documents legally stored for 10 years",
        "Unlimited file storage for documents and records",
        "Dedicated setup and onboarding support",
        "Unlimited WhatsApp reminders",
      ],
    },
  },
];

export const DEFAULT_PLAN_ID = "starter";

// Whether a clinic is an active paying subscriber (vs. a free trial). Used to
// give paying clinics priority placement in the public directory. This signal
// must never be surfaced to patients in the UI.
export function isPaidClinic(profile) {
  if (!profile) return false;
  return profile.billing === "stripe" && profile.stripe?.status === "active";
}

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
