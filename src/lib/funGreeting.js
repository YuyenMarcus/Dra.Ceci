// Playful, time-of-day greetings for the home pages. Returns a bucket
// (matching the formal greeting) plus a fun one-liner that changes with the
// hour. {name} is interpolated with the person's name.
//
// Buckets by hour:
//   0–4   lateNight (madrugada)  — e.g. "Noches largas, ¿verdad?"
//   5–11  morning
//   12–18 afternoon
//   19–23 evening

const MESSAGES = {
  es: {
    lateNight: [
      "Noches largas, ¿verdad, {name}?",
      "¿Otra vez despierta a esta hora, {name}?",
      "El consultorio nunca duerme… y al parecer tú tampoco, {name}",
    ],
    morning: [
      "¡A comernos el día, {name}!",
      "Café en mano y a sonreír, {name}",
      "Buen día para salvar sonrisas, {name}",
    ],
    afternoon: [
      "¿Cómo va la tarde, {name}?",
      "A mitad del día y sin soltar el espejito, {name}",
      "La tarde es tuya, {name}",
    ],
    evening: [
      "A cerrar el día con broche de oro, {name}",
      "Última recta del día, {name}",
      "Casi hora de descansar, {name}",
    ],
  },
  en: {
    lateNight: [
      "Long nights, huh, {name}?",
      "Up at this hour again, {name}?",
      "The clinic never sleeps… and neither do you, {name}",
    ],
    morning: [
      "Let's take on the day, {name}!",
      "Coffee in hand and smiles ahead, {name}",
      "Great day to save some smiles, {name}",
    ],
    afternoon: [
      "How's the afternoon treating you, {name}?",
      "Halfway through and still holding the mirror, {name}",
      "The afternoon is yours, {name}",
    ],
    evening: [
      "Let's wrap the day on a high note, {name}",
      "Final stretch of the day, {name}",
      "Almost time to rest, {name}",
    ],
  },
};

// Formal greeting key for the <h1> ("Buenos días", etc.).
export function greetingKey(hour = new Date().getHours()) {
  if (hour < 5) return "greet.evening";
  if (hour < 12) return "greet.morning";
  if (hour < 19) return "greet.afternoon";
  return "greet.evening";
}

function bucket(hour) {
  if (hour < 5) return "lateNight";
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

// Pick a fun line for the current time. `seed` makes the choice stable across
// re-renders (pass something like the user id); omit for random each call.
export function funGreeting(lang, name = "", seed) {
  const hour = new Date().getHours();
  const table = MESSAGES[lang] || MESSAGES.es;
  const lines = table[bucket(hour)];
  const idx =
    seed != null
      ? Math.abs(hashString(String(seed)) + hour) % lines.length
      : Math.floor(Math.random() * lines.length);
  return lines[idx].replace(/\{name\}/g, name);
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + (h << 5) - h;
  return h;
}
