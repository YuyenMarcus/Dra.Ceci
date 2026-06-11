import InfoPage from "../components/InfoPage.jsx";

const content = {
  es: {
    title: "Acerca de Clinika",
    sub: "Software de gestión hecho para clínicas dentales de Latinoamérica.",
    contactTitle: "¿Quieres saber más?",
    contactSub: "Escríbenos y te respondemos personalmente.",
    sections: [
      {
        h: "Nuestra misión",
        body: [
          "Las clínicas dentales de la región siguen administrando citas en cuadernos, fichas en folders y el inventario de memoria. Las herramientas que existen suelen ser caras, complicadas o pensadas para otros mercados.",
          "Clinika existe para que cualquier consultorio — desde un dentista independiente hasta una clínica con varios doctores — tenga las mismas herramientas digitales que una gran cadena: agenda en línea, expedientes ordenados e inventario bajo control, sin curva de aprendizaje y a un precio justo.",
        ],
      },
      {
        h: "Qué hace Clinika",
        list: [
          "Agenda con prevención de citas dobles y recordatorios para tus pacientes.",
          "Página pública de tu clínica donde los pacientes reservan solos, sin crear cuenta.",
          "Fichas clínicas digitales con historial por paciente.",
          "Inventario con alertas antes de quedarte sin material.",
          "Portal del paciente para consultar citas y tratamientos.",
          "Todo bilingüe: español e inglés, con un clic.",
        ],
      },
      {
        h: "Cómo trabajamos",
        body: [
          "Solo cobramos por lo que ya funciona. Si un plan aparece como “Próximamente”, es porque sus funciones estrella todavía están en construcción — preferimos eso a venderte promesas.",
          "Construimos pegados a la realidad local: WhatsApp como canal principal, cumplimiento MINSAL en los documentos clínicos y facturación electrónica DTE con Hacienda (El Salvador) en nuestra hoja de ruta.",
        ],
      },
      {
        h: "Dónde estamos",
        body: [
          "Clinika se desarrolla para el mercado salvadoreño y centroamericano. Soporte y ventas: team@clinika.health.",
        ],
      },
    ],
  },
  en: {
    title: "About Clinika",
    sub: "Practice-management software built for Latin American dental clinics.",
    contactTitle: "Want to know more?",
    contactSub: "Write to us — a person answers.",
    sections: [
      {
        h: "Our mission",
        body: [
          "Dental clinics in the region still run appointments in notebooks, records in folders, and inventory from memory. Existing tools tend to be expensive, complicated, or designed for other markets.",
          "Clinika exists so that any practice — from an independent dentist to a multi-doctor clinic — gets the same digital tools as a large chain: online scheduling, tidy records and inventory under control, with no learning curve and at a fair price.",
        ],
      },
      {
        h: "What Clinika does",
        list: [
          "Scheduling with double-booking prevention and patient reminders.",
          "A public clinic page where patients book themselves, no account needed.",
          "Digital clinical records with per-patient history.",
          "Inventory with alerts before you run out of supplies.",
          "A patient portal for checking appointments and treatments.",
          "Fully bilingual: Spanish and English, one click apart.",
        ],
      },
      {
        h: "How we work",
        body: [
          "We only charge for what already works. If a plan shows “Coming soon”, its flagship features are still being built — we'd rather do that than sell promises.",
          "We build close to local reality: WhatsApp as the main channel, MINSAL-compliant clinical documents, and DTE electronic invoicing with Hacienda (El Salvador) on our roadmap.",
        ],
      },
      {
        h: "Where we are",
        body: [
          "Clinika is built for the Salvadoran and Central American market. Support and sales: team@clinika.health.",
        ],
      },
    ],
  },
};

export default function About() {
  return <InfoPage content={content} path="/about" />;
}
