import InfoPage from "../components/InfoPage.jsx";

const content = {
  es: {
    title: "Términos y condiciones",
    sub: "Las reglas de uso del servicio Clinika.",
    updated: "Última actualización: 11 de junio de 2026",
    contactTitle: "Preguntas sobre estos términos",
    contactSub: "Escríbenos antes de firmar nada que no entiendas.",
    sections: [
      {
        h: "1. Aceptación",
        body: [
          "Al crear una cuenta o usar clinika.health aceptas estos términos. Si usas Clinika en nombre de una clínica, declaras tener autoridad para aceptarlos por ella.",
        ],
      },
      {
        h: "2. El servicio",
        body: [
          "Clinika es una plataforma de gestión para clínicas dentales: agenda, reservas en línea, fichas de pacientes, inventario y portal del paciente. Clinika es desarrollada y operada por Nitron Digital LLC, titular de todos los derechos sobre el software. Clinika es una herramienta de software; no es un proveedor de servicios de salud y no participa en la relación médico-paciente.",
        ],
      },
      {
        h: "3. Cuentas",
        body: [
          "Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad bajo tu cuenta. Debes notificarnos de inmediato cualquier uso no autorizado.",
        ],
      },
      {
        h: "4. Planes, prueba y pagos",
        list: [
          "Todos los planes incluyen 14 días de prueba gratis; no se requiere tarjeta para empezar.",
          "Las suscripciones se cobran mensualmente a través de Stripe.",
          "Puedes cambiar de plan o cancelar en cualquier momento desde Ajustes → Gestionar facturación; la cancelación surte efecto al final del período pagado.",
          "Los planes marcados como “Próximamente” aún no están a la venta; sus funciones se publicarán cuando estén listas.",
          "Los precios pueden cambiar; cualquier cambio se anunciará con al menos 30 días de aviso.",
        ],
      },
      {
        h: "5. Responsabilidad de la clínica sobre los datos de pacientes",
        list: [
          "La clínica es la responsable de los expedientes que registra y de obtener el consentimiento de sus pacientes.",
          "La clínica debe usar la plataforma conforme a la normativa sanitaria y de protección de datos aplicable (incluido el MINSAL cuando corresponda).",
          "Clinika procesa esos datos solo para prestar el servicio, según nuestra Política de privacidad.",
        ],
      },
      {
        h: "6. Uso aceptable",
        list: [
          "No usar el servicio para actividades ilegales ni para registrar datos de personas sin base legítima.",
          "No intentar acceder a datos de otras clínicas ni vulnerar la seguridad de la plataforma.",
          "No revender el servicio sin acuerdo escrito.",
        ],
      },
      {
        h: "7. Disponibilidad y respaldo",
        body: [
          "Trabajamos para mantener el servicio disponible y respaldado, pero se ofrece “tal cual”, sin garantía de disponibilidad ininterrumpida. Te recomendamos exportar periódicamente tu información importante.",
        ],
      },
      {
        h: "8. Limitación de responsabilidad",
        body: [
          "En la máxima medida permitida por la ley, la responsabilidad total de Clinika frente a una clínica se limita al monto pagado por el servicio en los 12 meses anteriores al hecho que origine la reclamación. Clinika no responde por daños indirectos ni por decisiones clínicas tomadas por los profesionales.",
        ],
      },
      {
        h: "9. Terminación",
        body: [
          "Puedes eliminar tu cuenta en cualquier momento desde Ajustes. Podemos suspender o terminar cuentas que violen estos términos, con aviso previo cuando sea razonable.",
        ],
      },
      {
        h: "10. Cambios y ley aplicable",
        body: [
          "Podemos actualizar estos términos; los cambios relevantes se anunciarán en la aplicación con antelación. Estos términos se rigen por las leyes del Estado de Nueva Hampshire, Estados Unidos, sin dar efecto a sus normas sobre conflictos de leyes.",
        ],
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    sub: "The rules for using the Clinika service.",
    updated: "Last updated: June 11, 2026",
    contactTitle: "Questions about these terms",
    contactSub: "Write to us before agreeing to anything you don't understand.",
    sections: [
      {
        h: "1. Acceptance",
        body: [
          "By creating an account or using clinika.health you accept these terms. If you use Clinika on behalf of a clinic, you represent that you have authority to accept them for it.",
        ],
      },
      {
        h: "2. The service",
        body: [
          "Clinika is a management platform for dental clinics: scheduling, online booking, patient records, inventory and a patient portal. Clinika is developed and operated by Nitron Digital LLC, which holds all rights to the software. Clinika is a software tool; it is not a healthcare provider and takes no part in the doctor-patient relationship.",
        ],
      },
      {
        h: "3. Accounts",
        body: [
          "You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately of any unauthorized use.",
        ],
      },
      {
        h: "4. Plans, trial and payments",
        list: [
          "Every plan includes a 14-day free trial; no card is required to start.",
          "Subscriptions are billed monthly through Stripe.",
          "You can change plans or cancel anytime from Settings → Manage billing; cancellation takes effect at the end of the paid period.",
          "Plans marked “Coming soon” are not yet for sale; their features will launch when they are ready.",
          "Prices may change; any change will be announced with at least 30 days' notice.",
        ],
      },
      {
        h: "5. The clinic's responsibility for patient data",
        list: [
          "The clinic is the controller of the records it registers and responsible for obtaining its patients' consent.",
          "The clinic must use the platform in line with applicable health and data-protection regulations (including MINSAL where relevant).",
          "Clinika processes that data only to provide the service, per our Privacy Policy.",
        ],
      },
      {
        h: "6. Acceptable use",
        list: [
          "No illegal activity, and no recording personal data without a legitimate basis.",
          "No attempting to access other clinics' data or to compromise platform security.",
          "No reselling the service without written agreement.",
        ],
      },
      {
        h: "7. Availability and backups",
        body: [
          "We work to keep the service available and backed up, but it is provided “as is”, with no guarantee of uninterrupted availability. We recommend periodically exporting your important information.",
        ],
      },
      {
        h: "8. Limitation of liability",
        body: [
          "To the maximum extent permitted by law, Clinika's total liability to a clinic is limited to the amount paid for the service in the 12 months before the event giving rise to the claim. Clinika is not liable for indirect damages or for clinical decisions made by professionals.",
        ],
      },
      {
        h: "9. Termination",
        body: [
          "You can delete your account anytime from Settings. We may suspend or terminate accounts that violate these terms, with prior notice where reasonable.",
        ],
      },
      {
        h: "10. Changes and governing law",
        body: [
          "We may update these terms; meaningful changes will be announced in the app in advance. These terms are governed by the laws of the State of New Hampshire, United States, without regard to its conflict-of-law rules.",
        ],
      },
    ],
  },
};

export default function Terms() {
  return <InfoPage content={content} path="/terms" />;
}
