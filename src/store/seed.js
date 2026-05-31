// Initial demo data used the first time MedTrack runs (or after a reset).
//
// NOTE: This is a front-end demo. "Passwords" live in plain text in the browser
// only so the role-based experience can be explored without a real backend.

const today = new Date();
function dayOffset(days, hour = 9, min = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

// Returns an ISO time on the Nth working day (Mon–Fri) relative to today.
// n >= 1 walks forward (1 = next working day), n <= -1 walks backward.
function workday(n, hour = 9, min = 0) {
  const d = new Date(today);
  let remaining = Math.abs(n);
  const step = n >= 0 ? 1 : -1;
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) remaining--;
  }
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

const DOCTOR_ID = "doc-ceci";
const DOCTOR_NAME = "Dra. Ceci";

// Build an appointment. `who` is either { clientId } for an existing patient,
// or { name, phone } for a walk-in / online booking.
let _aptSeq = 0;
function appt(n, hour, min, who, reason, status = "scheduled") {
  _aptSeq += 1;
  const base = {
    id: `apt-${_aptSeq}`,
    doctorId: DOCTOR_ID,
    provider: DOCTOR_NAME,
    reason,
    start: workday(n, hour, min),
    durationMin: 30,
    status,
    createdAt: workday(-3, 9),
  };
  if (who.clientId) {
    base.clientId = who.clientId;
  } else {
    base.patientName = who.name;
    base.patientPhone = who.phone;
    base.source = "public";
  }
  return base;
}

const ava = { clientId: "cli-1" };
const marcus = { clientId: "cli-2" };
const sofia = { clientId: "cli-3" };
const david = { clientId: "cli-4" };

export const seedData = {
  doctors: [
    {
      id: DOCTOR_ID,
      name: DOCTOR_NAME,
      email: "ceci@medtrack.dev",
      password: "demo1234",
      specialty: "Odontología General",
      clinic: "Consultorio Dental Dra. Ceci",
      phone: "(555) 123-4567",
      address: "Av. Reforma 123, Col. Centro",
      city: "Ciudad de México, CDMX 06000",
      // Embeddable map link (Google Maps "place" search by address).
      mapQuery: "Av. Reforma 123, Centro, Ciudad de México",
      // 0=Sun ... 6=Sat
      workingDays: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 17,
      slotMinutes: 30,
    },
  ],
  inventory: [
    {
      id: "inv-1",
      name: "Nitrile Exam Gloves (M)",
      category: "PPE",
      sku: "GLV-NIT-M",
      quantity: 8,
      unit: "boxes",
      reorderLevel: 10,
      supplier: "MedSupply Co.",
      updatedAt: dayOffset(-2, 14),
    },
    {
      id: "inv-2",
      name: "Dental Composite Resin",
      category: "Dental Materials",
      sku: "DEN-CMP-A2",
      quantity: 24,
      unit: "syringes",
      reorderLevel: 8,
      supplier: "DentalPro",
      updatedAt: dayOffset(-5, 10),
    },
    {
      id: "inv-3",
      name: "Lidocaine 2% Cartridges",
      category: "Anesthetics",
      sku: "ANE-LID-2",
      quantity: 3,
      unit: "boxes",
      reorderLevel: 6,
      supplier: "PharmaDirect",
      updatedAt: dayOffset(-1, 9),
    },
    {
      id: "inv-4",
      name: "Surgical Face Masks",
      category: "PPE",
      sku: "MSK-SRG-3PLY",
      quantity: 42,
      unit: "boxes",
      reorderLevel: 15,
      supplier: "MedSupply Co.",
      updatedAt: dayOffset(-9, 16),
    },
    {
      id: "inv-5",
      name: "Sterile Gauze Pads 4x4",
      category: "Consumables",
      sku: "GAU-4X4",
      quantity: 0,
      unit: "packs",
      reorderLevel: 12,
      supplier: "MedSupply Co.",
      updatedAt: dayOffset(-3, 11),
    },
    {
      id: "inv-6",
      name: "Prophy Paste — Mint",
      category: "Dental Materials",
      sku: "DEN-PRO-MNT",
      quantity: 30,
      unit: "cups",
      reorderLevel: 10,
      supplier: "DentalPro",
      updatedAt: dayOffset(-7, 13),
    },
  ],
  clients: [
    {
      id: "cli-1",
      doctorId: DOCTOR_ID,
      name: "Ava Thompson",
      email: "ava.thompson@example.com",
      password: "demo1234",
      phone: "(555) 201-3344",
      dob: "1991-04-12",
      notes: "Allergic to penicillin.",
      ocupacion: "Profesora",
      direccion: "Av. Central 123, Col. Centro",
      sexo: "F",
      referidoPor: "Dra. Cecilia Angulo",
      enfermedades: "Ninguna conocida",
      historiaOdontologica: "Última limpieza hace 8 meses. Sangrado gingival ocasional.",
      hospitalizaciones: "Alergia a penicilina. Sin hospitalizaciones recientes.",
      medicamentoCabecera: "Ibuprofeno ocasional",
      sistemas: {
        snc: "Sin alteraciones",
        sh: "Normal",
        scv: "TA 120/80",
        sme: "Sin dolor articular",
        sci: "",
        si: "",
        se: "",
        sr: "Sin disnea",
        sgu: "Sin alteraciones",
        otros: "",
      },
      planTratamiento: "Profilaxis y control de placa. Evaluar pieza 36.",
      odontograma: {
        36: "caries",
        16: "obturado",
        11: "corona",
        48: "ausente",
        38: "ausente",
      },
      odontogramaNotas:
        "Pieza 36 con caries oclusal, programar resina. Terceros molares inferiores ausentes.",
      treatments: [
        { fecha: "2026-04-02", tratamiento: "Profilaxis dental", abonos: "500" },
        { fecha: "2026-04-20", tratamiento: "Resina pieza 36", abonos: "800" },
      ],
      createdAt: dayOffset(-40),
    },
    {
      id: "cli-2",
      doctorId: DOCTOR_ID,
      name: "Marcus Lee",
      email: "marcus.lee@example.com",
      password: "demo1234",
      phone: "(555) 887-1290",
      dob: "1984-11-30",
      notes: "Prefers afternoon appointments.",
      ocupacion: "Ingeniero",
      direccion: "Calle 5 de Mayo 45",
      sexo: "M",
      referidoPor: "Paciente recurrente",
      createdAt: dayOffset(-25),
    },
    {
      id: "cli-3",
      doctorId: DOCTOR_ID,
      name: "Sofia Garcia",
      email: "sofia.garcia@example.com",
      password: "demo1234",
      phone: "(555) 442-7781",
      dob: "2000-07-08",
      notes: "",
      ocupacion: "Estudiante",
      sexo: "F",
      createdAt: dayOffset(-12),
    },
    {
      id: "cli-4",
      doctorId: DOCTOR_ID,
      name: "David Okafor",
      email: "david.okafor@example.com",
      password: "demo1234",
      phone: "(555) 339-5520",
      dob: "1976-02-19",
      notes: "Nervous patient — explain procedures slowly.",
      ocupacion: "Comerciante",
      sexo: "M",
      referidoPor: "Marcus Lee",
      createdAt: dayOffset(-6),
    },
  ],
  appointments: [
    // ----- Next working day (busy morning + afternoon) -----
    appt(1, 9, 0, ava, "Limpieza dental"),
    appt(1, 9, 30, { name: "Lucía Fernández", phone: "(555) 610-2233" }, "Revisión general"),
    appt(1, 10, 30, marcus, "Resina pieza 26"),
    appt(1, 11, 0, { name: "Diego Ramírez", phone: "(555) 778-9001" }, "Dolor de muela"),
    appt(1, 13, 0, sofia, "Blanqueamiento"),
    appt(1, 14, 0, { name: "Valentina Cruz", phone: "(555) 220-4456" }, "Control de ortodoncia"),
    appt(1, 15, 30, david, "Endodoncia"),
    appt(1, 16, 0, { name: "Mateo Herrera", phone: "(555) 884-1177" }, "Consulta"),

    // ----- Day 2 -----
    appt(2, 9, 0, { name: "Camila Soto", phone: "(555) 339-7788" }, "Limpieza dental"),
    appt(2, 10, 0, marcus, "Revisión de resina"),
    appt(2, 11, 30, { name: "Sebastián Vargas", phone: "(555) 451-6620" }, "Extracción"),
    appt(2, 13, 30, ava, "Profilaxis"),
    appt(2, 15, 0, { name: "Renata Morales", phone: "(555) 902-3311" }, "Consulta de ortodoncia"),

    // ----- Day 3 -----
    appt(3, 9, 30, sofia, "Control de blanqueamiento"),
    appt(3, 12, 0, { name: "Tomás Aguirre", phone: "(555) 117-8855" }, "Dolor de muela"),
    appt(3, 14, 30, david, "Endodoncia — segunda sesión"),
    appt(3, 16, 30, { name: "Isabela Núñez", phone: "(555) 640-2299" }, "Revisión general"),

    // ----- Day 4 -----
    appt(4, 10, 0, { name: "Andrés Castillo", phone: "(555) 733-4410" }, "Limpieza dental"),
    appt(4, 11, 0, ava, "Resina pieza 36"),
    appt(4, 15, 0, { name: "Daniela Rojas", phone: "(555) 288-1902" }, "Consulta"),

    // ----- Day 5 -----
    appt(5, 9, 0, marcus, "Revisión general"),
    appt(5, 13, 0, { name: "Gabriel Méndez", phone: "(555) 504-7766" }, "Extracción"),

    // ----- Recent past visits (completed) -----
    appt(-1, 10, 0, sofia, "Limpieza dental", "completed"),
    appt(-1, 14, 0, { name: "Paula Estrada", phone: "(555) 661-2040" }, "Consulta", "completed"),
    appt(-2, 11, 0, david, "Revisión general", "completed"),
    appt(-3, 12, 0, ava, "Profilaxis", "completed"),
  ],
};
