import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Clock, X, CalendarPlus, CalendarX, ShieldCheck, ArrowRight } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import Confirm from "../components/Confirm.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import PhoneField from "../components/PhoneField.jsx";
import {
  getClinicBySlug,
  getBookingsByPhone,
  cancelBookingByPhone,
} from "../store/db.js";
import { formatDate, formatTime, relativeDay } from "../lib/format.js";

function PublicHeader({ slug }) {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
        <Link to={`/c/${slug}`} className="flex items-center gap-2.5">
          <BrandMark size={36} />
          <span className="text-lg font-bold text-slate-900">Clinika</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link to={`/c/${slug}/book`} className="btn-primary text-sm">
            <CalendarPlus size={16} /> {t("manage.book")}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function ManageBooking() {
  const { slug } = useParams();
  const { t, lang } = useLang();
  useSeo({ title: "Clinika", noindex: true });
  const [clinic, setClinic] = useState(null);
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toCancel, setToCancel] = useState(null);

  useEffect(() => {
    let active = true;
    getClinicBySlug(slug)
      .then((c) => active && setClinic(c))
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [slug]);

  async function lookup(e) {
    e.preventDefault();
    if (!clinic?.id || !phoneValid) return;
    setBusy(true);
    try {
      const all = await getBookingsByPhone(clinic.id, phone);
      const upcoming = all
        .filter((a) => a.status === "scheduled" && new Date(a.start).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start) - new Date(b.start));
      setResults(upcoming);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setBusy(false);
      setSearched(true);
    }
  }

  async function confirmCancel() {
    if (!toCancel) return;
    const res = await cancelBookingByPhone(toCancel.id, phone);
    if (res?.ok) {
      setResults((list) => list.filter((a) => a.id !== toCancel.id));
    }
    setToCancel(null);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader slug={slug} />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold text-slate-900">{t("manage.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("manage.sub")}</p>

        <form onSubmit={lookup} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <PhoneField
              lang={lang}
              placeholder={t("manage.phonePlaceholder")}
              onChange={({ e164, valid }) => {
                setPhone(e164);
                setPhoneValid(valid);
              }}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !phoneValid}
            className="btn-primary disabled:opacity-60"
          >
            <Search size={16} /> {t("common.find")}
          </button>
        </form>

        {searched && (
          <div className="mt-6 space-y-6">
            {results.length === 0 ? (
              <div className="card flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <CalendarX size={24} />
                </div>
                <p className="font-semibold text-slate-700">{t("manage.noneFound")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("manage.noneFoundSub")}</p>
                <Link to={`/c/${slug}/book`} className="btn-primary mt-5">
                  <CalendarPlus size={16} /> {t("manage.bookAppointment")}
                </Link>
              </div>
            ) : (
              results.map((a) => (
                <div key={a.id} className="card flex items-center justify-between gap-3 p-5">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <Clock size={16} className="text-brand-600" />
                      {t("book.atTime", { day: relativeDay(a.start), time: formatTime(a.start) })}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {formatDate(a.start)} · {a.provider || clinic?.name || t("common.doctor")}
                    </p>
                    <p className="text-sm text-slate-500">{a.reason}</p>
                    {a.notes && <p className="text-sm italic text-slate-400">“{a.notes}”</p>}
                  </div>
                  <button className="btn-danger px-3 py-2 text-xs" onClick={() => setToCancel(a)}>
                    <X size={14} /> {t("appt.cancel")}
                  </button>
                </div>
              ))
            )}

            {/* Clinical history and signed consents are PHI: never shown from a
                phone lookup. Patients view them in their own portal, after
                signing in and linking their records to their account. */}
            <div className="card flex flex-col gap-4 border-portal-100 bg-portal-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-portal-100 text-portal-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t("manage.recordsTitle")}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{t("manage.recordsBody")}</p>
                </div>
              </div>
              <Link to="/me/login" className="btn-portal shrink-0">
                {t("manage.recordsCta")} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Confirm
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        title={t("manage.cancelTitle")}
        message={t("manage.cancelMsg", {
          when: toCancel ? `${formatDate(toCancel.start)} · ${formatTime(toCancel.start)}` : "",
        })}
        confirmLabel={t("manage.cancelAppointment")}
      />
    </div>
  );
}
