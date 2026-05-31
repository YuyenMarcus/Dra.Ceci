import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  Search,
  Clock,
  X,
  CalendarPlus,
  CalendarX,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import Confirm from "../components/Confirm.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import {
  formatDate,
  formatTime,
  relativeDay,
  normalizePhone,
} from "../lib/format.js";

function PublicHeader() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
        <Link to="/dra-ceci" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Stethoscope size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900">MedTrack</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link to="/book" className="btn-primary text-sm">
            <CalendarPlus size={16} /> {t("manage.book")}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function ManageBooking() {
  const { appointments, doctors, cancelAppointment } = useStore();
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState("");
  const [toCancel, setToCancel] = useState(null);

  const doctorName = (id) =>
    doctors.find((d) => d.id === id)?.name ?? t("common.doctor");

  function lookup(e) {
    e.preventDefault();
    setSearched(normalizePhone(phone));
  }

  const results = searched
    ? appointments
        .filter(
          (a) =>
            normalizePhone(a.patientPhone || "") === searched &&
            a.status === "scheduled" &&
            new Date(a.start).getTime() >= Date.now()
        )
        .sort((a, b) => new Date(a.start) - new Date(b.start))
    : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold text-slate-900">{t("manage.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("manage.sub")}</p>

        <form onSubmit={lookup} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-10"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("manage.phonePlaceholder")}
            />
          </div>
          <button type="submit" className="btn-primary">
            {t("common.find")}
          </button>
        </form>

        {searched && (
          <div className="mt-6 space-y-3">
            {results.length === 0 ? (
              <div className="card flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <CalendarX size={24} />
                </div>
                <p className="font-semibold text-slate-700">
                  {t("manage.noneFound")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("manage.noneFoundSub")}
                </p>
                <Link to="/book" className="btn-primary mt-5">
                  <CalendarPlus size={16} /> {t("manage.bookAppointment")}
                </Link>
              </div>
            ) : (
              results.map((a) => (
                <div
                  key={a.id}
                  className="card flex items-center justify-between gap-3 p-5"
                >
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <Clock size={16} className="text-brand-600" />
                      {t("book.atTime", {
                        day: relativeDay(a.start),
                        time: formatTime(a.start),
                      })}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {formatDate(a.start)} · {doctorName(a.doctorId)}
                    </p>
                    <p className="text-sm text-slate-500">{a.reason}</p>
                    {a.notes && (
                      <p className="text-sm italic text-slate-400">“{a.notes}”</p>
                    )}
                  </div>
                  <button
                    className="btn-danger px-3 py-2 text-xs"
                    onClick={() => setToCancel(a)}
                  >
                    <X size={14} /> {t("appt.cancel")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Confirm
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={() => cancelAppointment(toCancel.id)}
        title={t("manage.cancelTitle")}
        message={t("manage.cancelMsg", {
          when: toCancel
            ? `${formatDate(toCancel.start)} · ${formatTime(toCancel.start)}`
            : "",
        })}
        confirmLabel={t("manage.cancelAppointment")}
      />
    </div>
  );
}
