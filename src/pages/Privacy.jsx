import InfoPage from "../components/InfoPage.jsx";

const content = {
  es: {
    title: "Política de privacidad",
    sub: "Qué datos recopilamos, para qué los usamos y cómo los protegemos.",
    updated: "Última actualización: 11 de junio de 2026",
    contactTitle: "Dudas sobre privacidad",
    contactSub: "Responderemos cualquier consulta sobre tus datos.",
    sections: [
      {
        h: "1. Quiénes somos",
        body: [
          "Clinika (clinika.health) es una plataforma de gestión para clínicas dentales, desarrollada y operada por Nitron Digital LLC, titular de todos los derechos sobre el software. Para consultas de privacidad escríbenos a team@clinika.health.",
        ],
      },
      {
        h: "2. Datos que recopilamos",
        list: [
          "Datos de cuenta: nombre, correo electrónico y contraseña (almacenada con hash, nunca en texto plano).",
          "Datos de la clínica: nombre, dirección, teléfono, horarios, servicios y fotos que el doctor decide publicar en su perfil.",
          "Datos de pacientes que la clínica registra: nombre, contacto, citas, notas clínicas e historial de tratamiento.",
          "Datos de reserva: nombre, teléfono y motivo cuando un paciente agenda una cita en la página pública de una clínica.",
          "Datos de facturación: gestionados por Stripe; Clinika no almacena números de tarjeta.",
          "Datos de uso: eventos básicos del producto (por ejemplo, inicio de sesión, funciones usadas) para mejorar el servicio.",
        ],
      },
      {
        h: "3. Para qué usamos los datos",
        list: [
          "Prestar el servicio: agenda, fichas, inventario, portal del paciente y recordatorios.",
          "Procesar suscripciones y pagos a través de Stripe.",
          "Dar soporte y comunicar cambios importantes del servicio.",
          "Mejorar el producto con métricas de uso agregadas.",
        ],
        tail: [
          "No vendemos datos personales a terceros, ni usamos los datos clínicos de los pacientes para publicidad.",
        ],
      },
      {
        h: "4. Datos de pacientes: quién es responsable",
        body: [
          "Respecto a los expedientes de pacientes, cada clínica es la responsable del tratamiento de esos datos y Clinika actúa como encargado: los almacenamos y procesamos únicamente para prestar el servicio a la clínica. La clínica es responsable de obtener el consentimiento de sus pacientes y de la exactitud de la información que registra.",
        ],
      },
      {
        h: "5. Proveedores que usamos",
        list: [
          "Supabase — base de datos y autenticación (datos cifrados en tránsito).",
          "Stripe — procesamiento de pagos y suscripciones.",
          "Vercel — alojamiento de la aplicación web.",
        ],
        tail: [
          "Estos proveedores procesan datos solo según nuestras instrucciones y sus propias certificaciones de seguridad.",
        ],
      },
      {
        h: "6. Cookies y almacenamiento local",
        body: [
          "Usamos almacenamiento local del navegador para mantener tu sesión iniciada y recordar preferencias (idioma, tema claro/oscuro). No usamos cookies de publicidad ni rastreadores de terceros.",
        ],
      },
      {
        h: "7. Seguridad",
        list: [
          "Aislamiento por clínica a nivel de base de datos (row-level security): cada clínica solo puede acceder a su propia información.",
          "Cifrado en tránsito (HTTPS/TLS) en toda la plataforma.",
          "Acceso interno restringido y registrado.",
        ],
      },
      {
        h: "8. Retención y eliminación",
        body: [
          "Conservamos los datos mientras la cuenta esté activa. Puedes eliminar tu clínica desde Ajustes → Cuenta; esto elimina la cuenta y sus datos asociados. Algunos registros de facturación pueden conservarse el tiempo que exija la ley fiscal.",
        ],
      },
      {
        h: "9. Tus derechos",
        body: [
          "Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiendo a team@clinika.health. Si eres paciente de una clínica que usa Clinika, dirige tu solicitud a tu clínica; les daremos el soporte técnico necesario para cumplirla.",
        ],
      },
      {
        h: "10. Cambios a esta política",
        body: [
          "Si cambiamos esta política de forma relevante, lo anunciaremos en la aplicación antes de que el cambio entre en vigor.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    sub: "What data we collect, what we use it for, and how we protect it.",
    updated: "Last updated: June 11, 2026",
    contactTitle: "Privacy questions",
    contactSub: "We'll answer any question about your data.",
    sections: [
      {
        h: "1. Who we are",
        body: [
          "Clinika (clinika.health) is a management platform for dental clinics, developed and operated by Nitron Digital LLC, which holds all rights to the software. For privacy inquiries write to team@clinika.health.",
        ],
      },
      {
        h: "2. Data we collect",
        list: [
          "Account data: name, email and password (stored hashed, never in plain text).",
          "Clinic data: name, address, phone, hours, services and photos the doctor chooses to publish on their profile.",
          "Patient data recorded by the clinic: name, contact details, appointments, clinical notes and treatment history.",
          "Booking data: name, phone and reason when a patient books through a clinic's public page.",
          "Billing data: handled by Stripe; Clinika does not store card numbers.",
          "Usage data: basic product events (e.g. sign-ins, features used) to improve the service.",
        ],
      },
      {
        h: "3. What we use data for",
        list: [
          "Providing the service: scheduling, records, inventory, patient portal and reminders.",
          "Processing subscriptions and payments through Stripe.",
          "Support and communicating important service changes.",
          "Improving the product with aggregated usage metrics.",
        ],
        tail: [
          "We do not sell personal data to third parties, and we never use patients' clinical data for advertising.",
        ],
      },
      {
        h: "4. Patient data: who is responsible",
        body: [
          "For patient records, each clinic is the data controller and Clinika acts as a processor: we store and process those records solely to provide the service to the clinic. The clinic is responsible for obtaining its patients' consent and for the accuracy of the information it records.",
        ],
      },
      {
        h: "5. Providers we use",
        list: [
          "Supabase — database and authentication (data encrypted in transit).",
          "Stripe — payment and subscription processing.",
          "Vercel — web application hosting.",
        ],
        tail: [
          "These providers process data only under our instructions and their own security certifications.",
        ],
      },
      {
        h: "6. Cookies and local storage",
        body: [
          "We use browser local storage to keep you signed in and remember preferences (language, light/dark theme). We use no advertising cookies or third-party trackers.",
        ],
      },
      {
        h: "7. Security",
        list: [
          "Per-clinic isolation at the database level (row-level security): each clinic can only access its own information.",
          "Encryption in transit (HTTPS/TLS) across the platform.",
          "Restricted, logged internal access.",
        ],
      },
      {
        h: "8. Retention and deletion",
        body: [
          "We keep data while the account is active. You can delete your clinic from Settings → Account; this removes the account and its associated data. Some billing records may be kept for as long as tax law requires.",
        ],
      },
      {
        h: "9. Your rights",
        body: [
          "You can request access, correction or deletion of your personal data by writing to team@clinika.health. If you are a patient of a clinic that uses Clinika, address your request to your clinic; we will give them the technical support needed to fulfil it.",
        ],
      },
      {
        h: "10. Changes to this policy",
        body: [
          "If we change this policy in a meaningful way, we will announce it in the app before the change takes effect.",
        ],
      },
    ],
  },
};

export default function Privacy() {
  return <InfoPage content={content} path="/privacy" />;
}
