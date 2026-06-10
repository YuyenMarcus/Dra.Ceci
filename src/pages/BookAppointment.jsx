import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Stethoscope,
  ArrowLeft,
  Clock,
  Check,
  CheckCircle2,
  ShieldCheck,
  CalendarDays,
  HelpCircle,
} from "lucide-react";
import Tour from "../components/Tour.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import Calendar from "../components/Calendar.jsx";
import PhoneField from "../components/PhoneField.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { getClinicBySlug, getTakenSlots, requestAppointmentRpc } from "../store/db.js";
import { formatDate, formatTime, relativeDay } from "../lib/format.js";
import { generateSlots, upcomingWorkingDays, dateKey } from "../lib/availability.js";
import { VISIT_REASON_KEYS } from "../lib/reasons.js";

const TOUR_KEY = "medtrack.tour.book";

function PublicHeader({ slug, onReplayTour }) {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
        <Link to={`/c/${slug}`} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Stethoscope size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900">Clinika</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {onReplayTour && (
            <button onClick={onReplayTour} className="btn-ghost text-sm" title={t("book.howItWorks")}>
              <HelpCircle size={16} />
              <span className="hidden sm:inline">{t("book.howItWorks")}</span>
            </button>
          )}
          <Link to={`/c/${slug}/manage`} className="btn-ghost text-sm">
            {t("book.manageBooking")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Stepper({ step }) {
  const { t } = useLang();
  const steps = [t("book.stepTime"), t("book.stepDetails")];
  const idx = { slot: 0, details: 1 }[step] ?? 0;
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i <= idx ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={`hidden text-sm font-medium sm:inline ${i <= idx ? "text-slate-800" : "text-slate-400"}`}>
            {label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 sm:w-10" />}
        </div>
      ))}
    </div>
  );
}

export default function BookAppointment() {
  const { slug } = useParams();
  const { t, lang } = useLang();

  const [clinic, setClinic] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [takenSlots, setTakenSlots] = useState([]);
  const [step, setStep] = useState("slot");
  const [selectedDay, setSelectedDay] = useState("");
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", reason: "", notes: "" });
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneKey, setPhoneKey] = useState(0);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const bookTourSteps = [
    { title: t("book.tour1.title"), body: t("book.tour1.body") },
    { selector: '[data-tour="schedule"]', interactive: true, title: t("book.tour2.title"), body: t("book.tour2.body") },
    { title: t("book.tour3.title"), body: t("book.tour3.body") },
  ];

  useEffect(() => {
    let active = true;
    setLoadingClinic(true);
    getClinicBySlug(slug)
      .then((c) => active && setClinic(c))
      .catch((err) => console.error(err))
      .finally(() => active && setLoadingClinic(false));
    return () => {
      active = false;
    };
  }, [slug]);

  // Load taken slots for the booking window so availability never collides.
  useEffect(() => {
    if (!clinic?.id) return;
    let active = true;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 60);
    getTakenSlots(clinic.id, from.toISOString(), to.toISOString())
      .then((slots) =>
        active &&
        setTakenSlots(
          slots.map((s) => ({
            doctorId: clinic.id,
            status: "scheduled",
            start: s.start,
            durationMin: s.durationMin,
          }))
        )
      )
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [clinic?.id, confirmation]);

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return undefined;
    const tm = setTimeout(() => {
      setTourOpen(true);
      // Mark it seen the moment it shows — not only on close — so it never
      // reappears even if the user books through the interactive step (and
      // gets navigated to the confirmation) without clicking "Got it".
      try {
        localStorage.setItem(TOUR_KEY, "1");
      } catch {
        /* storage may be unavailable */
      }
    }, 600);
    return () => clearTimeout(tm);
  }, []);

  function closeTour() {
    localStorage.setItem(TOUR_KEY, "1");
    setTourOpen(false);
  }

  const workingDays = useMemo(() => (clinic ? upcomingWorkingDays(clinic, 30) : []), [clinic]);
  const activeDay = selectedDay || (workingDays[0] && dateKey(workingDays[0]));
  const slots = useMemo(
    () => (clinic && activeDay ? generateSlots(clinic, activeDay, takenSlots) : []),
    [clinic, activeDay, takenSlots]
  );
  const availableCount = slots.filter((s) => s.available).length;

  function pickSlot(s) {
    setSlot(s);
    setError(null);
    setStep("details");
  }

  async function submit(e) {
    e.preventDefault();
    if (!phoneValid) {
      setError({ key: "err.validPhone" });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await requestAppointmentRpc({
      clinicId: clinic.id,
      patientName: form.name,
      patientPhone: form.phone,
      patientEmail: form.email,
      reason: form.reason,
      notes: form.notes,
      start: slot.start,
      durationMin: slot.durationMin,
    });
    setBusy(false);
    if (!res?.ok) {
      setError({ key: res?.error || "err.bookingFailed" });
      return;
    }
    setConfirmation({
      patientName: form.name,
      patientPhone: form.phone,
      reason: form.reason || t("reason.checkup"),
      notes: form.notes,
      start: slot.start,
      durationMin: slot.durationMin,
      doctorName: clinic.name,
    });
  }

  function reset() {
    setStep("slot");
    setSelectedDay("");
    setSlot(null);
    setForm({ name: "", phone: "", email: "", reason: "", notes: "" });
    setPhoneValid(false);
    setPhoneKey((k) => k + 1);
    setError(null);
    setConfirmation(null);
  }

  if (loadingClinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">404</h1>
        <Link to="/" className="btn-primary">
          Clinika
        </Link>
      </div>
    );
  }

  // Clinic has paused online bookings.
  if (clinic.profile?.suspended) {
    return (
      <div className="min-h-screen bg-slate-100">
        <PublicHeader slug={slug} />
        <main className="mx-auto max-w-md px-5 py-12">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              {t("book.pausedTitle", { name: clinic.name })}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{t("book.pausedBody")}</p>
            <Link to={`/c/${slug}`} className="btn-outline mt-6">
              {t("book.backHome")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---- Success screen ----
  if (confirmation) {
    return (
      <div className="min-h-screen bg-slate-100">
        <PublicHeader slug={slug} />
        <main className="mx-auto max-w-md px-5 py-12">
          <div className="card animate-fade-up p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={34} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("book.youreBooked")}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t("book.confirmationSaved", { name: confirmation.patientName })}
            </p>
            <div className="mt-6 space-y-1 rounded-2xl bg-brand-50 px-5 py-4 text-left">
              <p className="flex items-center gap-2 font-semibold text-brand-800">
                <Clock size={16} />
                {t("book.atTime", { day: relativeDay(confirmation.start), time: formatTime(confirmation.start) })}
              </p>
              <p className="text-sm text-brand-700/80">
                {formatDate(confirmation.start)} · {confirmation.durationMin} min
              </p>
              <p className="text-sm text-brand-700/80">
                {confirmation.doctorName} · {confirmation.reason}
              </p>
              {confirmation.notes && (
                <p className="text-sm italic text-brand-700/70">“{confirmation.notes}”</p>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {t("book.needCancel")}{" "}
              <Link to={`/c/${slug}/manage`} className="font-medium text-brand-600">
                {t("book.manageBooking")}
              </Link>{" "}
              {t("book.withPhone", { phone: confirmation.patientPhone })}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button className="btn-outline" onClick={reset}>
                {t("book.bookAnother")}
              </button>
              <Link to={`/c/${slug}`} className="btn-ghost">
                {t("book.backHome")}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader slug={slug} onReplayTour={() => setTourOpen(true)} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Stepper step={step} />

        {/* Step 1: pick slot */}
        {step === "slot" && (
          <div className="animate-fade-up">
            <div data-tour="schedule" className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{clinic.name}</p>
                  <p className="text-xs text-slate-400">
                    {clinic.specialty} · {clinic.clinic}
                  </p>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="label">{t("book.pickDay")}</p>
                <Calendar doctor={clinic} value={activeDay} onSelect={setSelectedDay} />

                <div className="mt-5 flex items-center justify-between">
                  <p className="label mb-0">{t("book.availableTimes")}</p>
                  <span className="text-xs text-slate-400">
                    {t("book.openEach", { count: availableCount, min: clinic.slotMinutes })}
                  </span>
                </div>
                {slots.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                    {t("book.notAvailable", { name: clinic.name })}
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => (
                      <button
                        key={s.start}
                        disabled={!s.available}
                        onClick={() => pickSlot(s)}
                        className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                          s.available
                            ? "border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                            : "cursor-not-allowed border-transparent bg-slate-100 text-slate-300 line-through"
                        }`}
                      >
                        {formatTime(s.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: details */}
        {step === "details" && slot && (
          <div className="animate-fade-up mx-auto max-w-lg">
            <button
              onClick={() => setStep("slot")}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={16} /> {t("book.changeTime")}
            </button>
            <div className="card p-6">
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
                <CalendarDays size={18} className="mt-0.5 text-brand-600" />
                <div>
                  <p className="font-semibold text-brand-800">
                    {t("book.atTime", { day: relativeDay(slot.start), time: formatTime(slot.start) })}
                  </p>
                  <p className="text-sm text-brand-700/80">
                    {formatDate(slot.start)} · {clinic.name} · {slot.durationMin} min
                  </p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">{t("book.yourName")}</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setError(null);
                    }}
                    placeholder={t("book.fullName")}
                  />
                </div>
                <div>
                  <label className="label">{t("book.phoneNumber")}</label>
                  <PhoneField
                    key={phoneKey}
                    lang={lang}
                    onChange={({ e164, valid }) => {
                      setForm((f) => ({ ...f, phone: e164 }));
                      setPhoneValid(valid);
                      setError(null);
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-400">{t("book.phoneHint")}</p>
                </div>
                <div>
                  <label className="label">{t("book.emailOptional")}</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label">{t("book.reasonLabel")}</label>
                  <select
                    className="input"
                    required
                    value={form.reason}
                    onChange={(e) => {
                      setForm({ ...form, reason: e.target.value });
                      setError(null);
                    }}
                  >
                    <option value="" disabled>
                      {t("common.select")}
                    </option>
                    {VISIT_REASON_KEYS.map((key) => (
                      <option key={key} value={t(key)}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t("appt.notes")}</label>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t("appt.notesPlaceholder")}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                    {t(error.key, error.vars)}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
                  <Check size={18} /> {t("book.confirmAppointment")}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <ShieldCheck size={13} /> {t("book.limit")}
                </p>
              </form>
            </div>
          </div>
        )}
      </main>

      <Tour steps={bookTourSteps} open={tourOpen} onClose={closeTour} />
    </div>
  );
}
