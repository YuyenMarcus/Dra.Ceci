import InfoPage from "../components/InfoPage.jsx";

const content = {
  es: {
    title: "Centro de ayuda",
    sub: "Guías rápidas para sacarle provecho a Clinika.",
    contactTitle: "¿No encontraste tu respuesta?",
    contactSub: "Escríbenos y te ayudamos en persona, normalmente el mismo día.",
    sections: [
      {
        h: "Primeros pasos",
        list: [
          "Crea tu cuenta en clinika.health/signup — sin tarjeta, con 14 días de prueba.",
          "Configura tu clínica en Ajustes: nombre, horarios e idioma.",
          "Personaliza tu página pública en Perfil: fotos, servicios, biografía y ubicación con pin en el mapa.",
          "Comparte tu enlace (clinika.health/c/tu-clinica) en WhatsApp, Instagram o tu bio — tus pacientes ya pueden reservar.",
        ],
      },
      {
        h: "Citas y agenda",
        list: [
          "Las reservas de tu página pública entran directo a tu agenda y bloquean el horario para evitar citas dobles.",
          "Puedes crear citas manualmente desde Citas → Agendar cita.",
          "El panel de inicio muestra las citas de hoy, las próximas y las cancelaciones.",
        ],
      },
      {
        h: "Fichas de pacientes",
        list: [
          "Crea fichas desde Pacientes → Nueva ficha, con historial y notas por paciente.",
          "Importa tus pacientes existentes con un CSV: acepta columnas de nombre completo o nombre y apellido por separado.",
          "Cada paciente queda vinculado a sus citas pasadas y futuras.",
        ],
      },
      {
        h: "Inventario",
        list: [
          "Registra tus materiales con cantidad y umbral mínimo.",
          "Cuando el stock baja del umbral, aparece una alerta de reabastecimiento en el panel.",
        ],
      },
      {
        h: "Portal del paciente",
        list: [
          "Tus pacientes pueden crear su cuenta en clinika.health/me/signup para ver sus citas y tratamientos.",
          "Para reservar no necesitan cuenta: basta tu página pública.",
        ],
      },
      {
        h: "Planes y facturación",
        list: [
          "Todos los planes incluyen 14 días de prueba sin tarjeta.",
          "Suscríbete o cambia de plan en Ajustes → Plan de la clínica; el pago es mensual vía Stripe.",
          "Los planes marcados “Próximamente” aún no están a la venta.",
          "Cancela cuando quieras desde Gestionar facturación, sin penalidades.",
        ],
      },
      {
        h: "Cuenta y seguridad",
        list: [
          "¿Olvidaste tu contraseña? Recupérala desde “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión.",
          "Puedes pausar tu clínica (oculta tu página pública) o eliminarla definitivamente desde Ajustes → Cuenta.",
          "Cambia entre modo claro y oscuro con el ícono de luna/sol; tu preferencia se guarda.",
        ],
      },
    ],
  },
  en: {
    title: "Help Center",
    sub: "Quick guides to get the most out of Clinika.",
    contactTitle: "Didn't find your answer?",
    contactSub: "Write to us and we'll help personally, usually same-day.",
    sections: [
      {
        h: "Getting started",
        list: [
          "Create your account at clinika.health/signup — no card, 14-day trial.",
          "Configure your clinic in Settings: name, hours and language.",
          "Customize your public page in Profile: photos, services, bio and a map pin for your location.",
          "Share your link (clinika.health/c/your-clinic) on WhatsApp, Instagram or your bio — patients can book right away.",
        ],
      },
      {
        h: "Appointments and scheduling",
        list: [
          "Bookings from your public page land directly on your calendar and block the slot to prevent double-booking.",
          "Create appointments manually from Appointments → Schedule appointment.",
          "The dashboard shows today's appointments, upcoming ones and cancellations.",
        ],
      },
      {
        h: "Patient records",
        list: [
          "Create records from Patients → New record, with per-patient history and notes.",
          "Import existing patients with a CSV: it accepts a full-name column or separate first/last name columns.",
          "Each patient is linked to their past and future appointments.",
        ],
      },
      {
        h: "Inventory",
        list: [
          "Register your supplies with quantity and a minimum threshold.",
          "When stock drops below the threshold, a restock alert appears on the dashboard.",
        ],
      },
      {
        h: "Patient portal",
        list: [
          "Patients can create an account at clinika.health/me/signup to see their appointments and treatments.",
          "Booking requires no account — your public page is enough.",
        ],
      },
      {
        h: "Plans and billing",
        list: [
          "Every plan includes a 14-day trial, no card required.",
          "Subscribe or change plans in Settings → Clinic plan; billing is monthly via Stripe.",
          "Plans marked “Coming soon” are not for sale yet.",
          "Cancel anytime from Manage billing, no penalties.",
        ],
      },
      {
        h: "Account and security",
        list: [
          "Forgot your password? Recover it via “Forgot your password?” on the sign-in screen.",
          "You can pause your clinic (hides your public page) or delete it permanently from Settings → Account.",
          "Switch between light and dark mode with the moon/sun icon; your preference is saved.",
        ],
      },
    ],
  },
};

export default function Help() {
  return <InfoPage content={content} path="/help" />;
}
