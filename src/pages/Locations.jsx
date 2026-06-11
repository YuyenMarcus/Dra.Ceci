import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  Lock,
  Check,
  X,
  Loader2,
  Search,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import ClinicMap from "../components/ClinicMap.jsx";
import { listMyLocations, saveLocation, deleteLocation } from "../store/db.js";

// Weekday chips: display Mon→Sun but store JS getDay() numbers (Sun = 0).
const WEEKDAYS = [
  { day: 1, key: "day.mon" },
  { day: 2, key: "day.tue" },
  { day: 3, key: "day.wed" },
  { day: 4, key: "day.thu" },
  { day: 5, key: "day.fri" },
  { day: 6, key: "day.sat" },
  { day: 0, key: "day.sun" },
];

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

const blankLocation = () => ({
  name: "",
  address: "",
  city: "",
  phone: "",
  mapQuery: "",
  lat: null,
  lng: null,
  hours: "",
  workingDays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 17,
  slotMinutes: 30,
  active: true,
});

function hourLabel(h) {
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:00 ${h < 12 ? "AM" : "PM"}`;
}

function LocationForm({ initial, onCancel, onSave, t }) {
  const [form, setForm] = useState(() => ({ ...blankLocation(), ...initial }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day].sort((a, b) => a - b),
    }));

  async function searchPlace() {
    const q = [form.address, form.city].filter(Boolean).join(", ").trim();
    if (!q) return;
    setGeoBusy(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        set({ lat: Number(data[0].lat), lng: Number(data[0].lon), mapQuery: q });
      } else {
        setGeoError("pedit.searchNotFound");
      }
    } catch {
      setGeoError("pedit.searchFailed");
    } finally {
      setGeoBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("loc.errName");
      return;
    }
    if (form.endHour <= form.startHour) {
      setError("loc.errHours");
      return;
    }
    if (form.workingDays.length === 0) {
      setError("loc.errDays");
      return;
    }
    setBusy(true);
    setError("");
    const res = await onSave(form);
    setBusy(false);
    if (!res?.ok) setError(res?.error || "admin.saveError");
  }

  return (
    <form onSubmit={submit} className="card border-brand-200 p-6 dark:border-brand-800">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <Building2 size={20} />
        </div>
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {initial?.id ? t("loc.editTitle") : t("loc.addTitle")}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">{t("loc.name")}</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t("loc.namePh")}
          />
        </div>
        <div>
          <label className="label">{t("loc.address")}</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder={t("loc.addressPh")}
          />
        </div>
        <div>
          <label className="label">{t("loc.city")}</label>
          <input
            className="input"
            value={form.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder={t("loc.cityPh")}
          />
        </div>
        <div>
          <label className="label">{t("loc.phone")}</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="+503 0000 0000"
          />
        </div>
        <div>
          <label className="label">{t("loc.hours")}</label>
          <input
            className="input"
            value={form.hours}
            onChange={(e) => set({ hours: e.target.value })}
            placeholder={t("loc.hoursPh")}
          />
        </div>
      </div>

      {/* Map pin */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">{t("loc.pin")}</label>
          <button
            type="button"
            onClick={searchPlace}
            disabled={geoBusy}
            className="btn-ghost px-2.5 py-1.5 text-xs"
          >
            {geoBusy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {t("loc.findOnMap")}
          </button>
        </div>
        {geoError && <p className="mb-1.5 text-xs font-medium text-rose-600">{t(geoError)}</p>}
        <ClinicMap
          editable
          lat={form.lat}
          lng={form.lng}
          onChange={({ lat, lng }) => set({ lat, lng })}
          className="h-56 w-full overflow-hidden rounded-xl"
        />
      </div>

      {/* Schedule */}
      <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Clock size={15} className="text-brand-600" /> {t("loc.schedule")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map(({ day, key }) => {
            const on = form.workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {t(key)}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">{t("loc.opens")}</label>
            <select
              className="input"
              value={form.startHour}
              onChange={(e) => set({ startHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("loc.closes")}</label>
            <select
              className="input"
              value={form.endHour}
              onChange={(e) => set({ endHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("loc.slot")}</label>
            <select
              className="input"
              value={form.slotMinutes}
              onChange={(e) => set({ slotMinutes: Number(e.target.value) })}
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t("loc.slotMin", { min: m })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set({ active: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        {t("loc.activeLabel")}
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
          {t(error)}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {t("common.save")}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          <X size={16} /> {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

function LocationCard({ loc, onEdit, onDelete, t }) {
  const dayList = WEEKDAYS.filter((w) => loc.workingDays?.includes(w.day))
    .map((w) => t(w.key))
    .join(", ");
  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between dark:bg-slate-900">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <Building2 size={17} />
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {loc.name || t("loc.untitled")}
          </span>
          {!loc.active && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
              {t("loc.inactive")}
            </span>
          )}
        </div>
        <div className="mt-2 space-y-1 pl-11 text-sm text-slate-500 dark:text-slate-400">
          {(loc.address || loc.city) && (
            <p className="flex items-center gap-1.5">
              <MapPin size={13} /> {[loc.address, loc.city].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <Clock size={13} /> {dayList || t("loc.noDays")} · {hourLabel(loc.startHour)}–
            {hourLabel(loc.endHour)} · {t("loc.slotMin", { min: loc.slotMinutes })}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button className="btn-ghost px-2.5 py-2 text-xs" onClick={() => onEdit(loc)}>
          <Pencil size={15} /> {t("common.edit")}
        </button>
        <button
          className="btn-ghost px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50"
          onClick={() => onDelete(loc)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// Read-only teaser shown to Starter clinics: they can see what the feature
// looks like, but every control is locked behind an upgrade.
function LockedPreview({ t }) {
  const sample = [
    { name: t("loc.sample1"), city: t("loc.sampleCity1"), hours: "Lun–Vie · 9:00 AM–5:00 PM" },
    { name: t("loc.sample2"), city: t("loc.sampleCity2"), hours: "Lun–Sáb · 8:00 AM–6:00 PM" },
  ];
  return (
    <div className="relative">
      <div className="pointer-events-none space-y-3 opacity-50 blur-[1.5px]" aria-hidden>
        {sample.map((s) => (
          <div key={s.name} className="card flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Building2 size={17} />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {s.city} · {s.hours}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="card max-w-md p-6 text-center shadow-xl dark:bg-slate-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <Lock size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("loc.lockTitle")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("loc.lockBody")}</p>
          <Link to="/app/settings" className="btn-primary mt-5">
            <Sparkles size={16} /> {t("loc.lockCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Locations() {
  const { clinic, can } = useAuth();
  const { t } = useLang();
  useSeo({ title: `${t("nav.locations")} | Clinika`, noindex: true });

  const allowed = can("multiLocation");
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // location object or "new"
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed || !clinic?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    listMyLocations(clinic.id)
      .then((rows) => active && setLocations(rows))
      .catch((err) => active && setError(err.message || "error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [allowed, clinic?.id]);

  async function handleSave(form) {
    const sortOrder = form.id
      ? form.sortOrder
      : locations.length; // append new branches to the end
    const res = await saveLocation(clinic.id, { ...form, sortOrder });
    if (res.ok) {
      setLocations((prev) => {
        const exists = prev.some((l) => l.id === res.location.id);
        return exists
          ? prev.map((l) => (l.id === res.location.id ? res.location : l))
          : [...prev, res.location];
      });
      setEditing(null);
    }
    return res;
  }

  async function handleDelete(loc) {
    if (!window.confirm(t("loc.confirmDelete", { name: loc.name || t("loc.untitled") }))) return;
    const res = await deleteLocation(loc.id);
    if (res.ok) setLocations((prev) => prev.filter((l) => l.id !== loc.id));
    else setError(res.error || "error");
  }

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("loc.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("loc.subtitle")}</p>
    </div>
  );

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl">
        {header}
        <LockedPreview t={t} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("loc.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("loc.subtitle")}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing("new")} className="btn-primary">
            <Plus size={16} /> {t("loc.add")}
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
          {t(error) || error}
        </p>
      )}

      {editing ? (
        <LocationForm
          initial={editing === "new" ? {} : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          t={t}
        />
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-brand-600" />
        </div>
      ) : locations.length === 0 ? (
        <div className="card p-10 text-center dark:bg-slate-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <Building2 size={22} />
          </div>
          <p className="font-semibold text-slate-900 dark:text-white">{t("loc.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {t("loc.emptyBody")}
          </p>
          <button onClick={() => setEditing("new")} className="btn-primary mt-5">
            <Plus size={16} /> {t("loc.add")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              onEdit={setEditing}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
