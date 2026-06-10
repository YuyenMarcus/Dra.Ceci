import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Image as ImageIcon,
  Upload,
  Loader2,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  User,
  MapPin,
  FileText,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { updateClinic, uploadProfileImage } from "../store/db.js";
import ClinicMap from "../components/ClinicMap.jsx";

const IMAGE_FIELDS = [
  { key: "hero", labelKey: "pedit.imgHero" },
  { key: "doctor", labelKey: "pedit.imgDoctor" },
  { key: "reception", labelKey: "pedit.imgReception" },
  { key: "treatment", labelKey: "pedit.imgTreatment" },
  { key: "equipment", labelKey: "pedit.imgEquipment" },
];

const MAX_SERVICES = 8;

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ImageField({ field, value, ownerId, onChange, t }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const url = await uploadProfileImage(ownerId, field.key, file);
      onChange(url);
    } catch (uploadErr) {
      console.error("Image upload failed:", uploadErr);
      setErr("pedit.uploadFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        {value ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={value} alt={t(field.labelKey)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
            <ImageIcon size={26} />
            <span className="text-xs font-medium">{t(field.labelKey)}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 size={22} className="animate-spin text-brand-600" />
          </div>
        )}
      </div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{t(field.labelKey)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pick}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-outline text-xs disabled:opacity-60"
        >
          <Upload size={14} /> {t("pedit.upload")}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn-ghost text-xs text-rose-600"
          >
            <Trash2 size={14} /> {t("pedit.remove")}
          </button>
        )}
      </div>
      <input
        className="input mt-2 text-xs"
        placeholder={t("pedit.imgUrl")}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {err && <p className="mt-1.5 text-xs font-medium text-rose-600">{t(err)}</p>}
    </div>
  );
}

export default function ProfileEdit() {
  const { clinic, refreshClinic } = useAuth();
  const { t } = useLang();

  const p = clinic?.profile || {};
  const [form, setForm] = useState({
    name: clinic?.name ?? "",
    specialty: clinic?.specialty ?? "",
    clinic: clinic?.clinic ?? "",
    phone: clinic?.phone ?? "",
    email: clinic?.email ?? "",
    address: clinic?.address ?? "",
    city: clinic?.city ?? "",
    mapQuery: clinic?.mapQuery ?? "",
    lat: Number.isFinite(p.lat) ? p.lat : null,
    lng: Number.isFinite(p.lng) ? p.lng : null,
    kicker: p.kicker ?? "",
    headline: p.headline ?? "",
    tagline: p.tagline ?? "",
    professionLabel: p.professionLabel ?? "",
    bio: p.bio ?? "",
    hours: p.hours ?? "",
    highlights: [
      p.highlights?.[0] ?? "",
      p.highlights?.[1] ?? "",
      p.highlights?.[2] ?? "",
    ],
    services: Array.isArray(p.services) ? p.services.map((s) => ({ ...s })) : [],
    images: { ...(p.images || {}) },
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Address-search state for recentering the pin map.
  const [geoQuery, setGeoQuery] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Geocode a free-text place via OpenStreetMap Nominatim (no API key) and drop
  // the pin there. The doctor can then drag it to fine-tune the exact spot.
  async function searchPlace(e) {
    e.preventDefault();
    const q = geoQuery.trim() || [form.address, form.city].filter(Boolean).join(", ");
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
        setForm((f) => ({ ...f, lat: Number(data[0].lat), lng: Number(data[0].lon) }));
        setSaved(false);
      } else {
        setGeoError("pedit.searchNotFound");
      }
    } catch (searchErr) {
      console.error("Geocoding failed:", searchErr);
      setGeoError("pedit.searchFailed");
    } finally {
      setGeoBusy(false);
    }
  }

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  };
  const setImage = (key, val) =>
    setForm((f) => ({ ...f, images: { ...f.images, [key]: val } }));
  const setHighlight = (i, val) =>
    setForm((f) => {
      const highlights = [...f.highlights];
      highlights[i] = val;
      return { ...f, highlights };
    });
  const setService = (i, key, val) =>
    setForm((f) => {
      const services = f.services.map((s, idx) =>
        idx === i ? { ...s, [key]: val } : s
      );
      return { ...f, services };
    });
  const addService = () =>
    setForm((f) =>
      f.services.length >= MAX_SERVICES
        ? f
        : { ...f, services: [...f.services, { name: "", desc: "" }] }
    );
  const removeService = (i) =>
    setForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));

  const slug = clinic?.slug ?? "";
  const profilePath = `/c/${slug}`;

  async function save(e) {
    e.preventDefault();
    if (!clinic) return;
    setSaving(true);
    setError("");
    const profile = {
      // Preserve any existing profile keys we don't edit here (e.g. onboarded,
      // plan) so saving the public profile never wipes the tutorial flag.
      ...(clinic.profile || {}),
      kicker: form.kicker.trim(),
      headline: form.headline.trim(),
      tagline: form.tagline.trim(),
      professionLabel: form.professionLabel.trim(),
      bio: form.bio.trim(),
      hours: form.hours.trim(),
      highlights: form.highlights.map((h) => h.trim()).filter(Boolean),
      services: form.services
        .map((s) => ({ name: (s.name || "").trim(), desc: (s.desc || "").trim() }))
        .filter((s) => s.name),
      images: Object.fromEntries(
        Object.entries(form.images).filter(([, v]) => v && v.trim())
      ),
      lat: Number.isFinite(form.lat) ? form.lat : null,
      lng: Number.isFinite(form.lng) ? form.lng : null,
    };
    try {
      await updateClinic(clinic.id, {
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        clinic: form.clinic.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        mapQuery: form.mapQuery.trim(),
        profile,
      });
      await refreshClinic();
      setSaved(true);
    } catch (saveErr) {
      console.error("Could not save profile:", saveErr);
      setError("pedit.saveFailed");
    } finally {
      setSaving(false);
    }
  }

  if (!clinic) return null;

  return (
    <form onSubmit={save} className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("pedit.title")}</h1>
          <p className="text-sm text-slate-500">{t("pedit.subtitle")}</p>
        </div>
        <Link to={profilePath} className="btn-outline text-sm">
          <ExternalLink size={16} /> {t("pedit.viewLive")}
        </Link>
      </div>

      <div className="gap-6 xl:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
      {/* Identity */}
      <Section icon={User} title={t("pedit.identityTitle")} hint={t("pedit.identityHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("pedit.displayName")}>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("pedit.displayNamePh")} />
          </Field>
          <Field label={t("pedit.specialty")}>
            <input className="input" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder={t("pedit.specialtyPh")} />
          </Field>
          <Field label={t("pedit.clinicName")}>
            <input className="input" value={form.clinic} onChange={(e) => set("clinic", e.target.value)} placeholder={t("pedit.clinicNamePh")} />
          </Field>
          <Field label={t("pedit.phone")}>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+503 0000 0000" />
          </Field>
          <Field label={t("pedit.email")}>
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@clinic.com" />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {t("pedit.slugFixed")} <span className="font-mono">/c/{slug}</span>
        </p>
      </Section>

      {/* About */}
      <Section icon={FileText} title={t("pedit.aboutTitle")} hint={t("pedit.aboutHint")}>
        <div className="space-y-4">
          <Field label={t("pedit.kicker")}>
            <input className="input" value={form.kicker} onChange={(e) => set("kicker", e.target.value)} placeholder={t("pedit.kickerPh")} />
            <p className="mt-1 text-xs text-slate-400">{t("pedit.kickerHint")}</p>
          </Field>
          <Field label={t("pedit.headline")}>
            <input className="input" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder={t("pedit.headlinePh")} />
          </Field>
          <Field label={t("pedit.tagline")}>
            <input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder={t("pedit.taglinePh")} />
          </Field>
          <Field label={t("pedit.professionLabel")}>
            <input className="input" value={form.professionLabel} onChange={(e) => set("professionLabel", e.target.value)} placeholder={t("pedit.professionLabelPh")} />
            <p className="mt-1 text-xs text-slate-400">{t("pedit.professionLabelHint")}</p>
          </Field>
          <Field label={t("pedit.bio")}>
            <textarea className="input min-h-[6rem]" value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder={t("pedit.bioPh")} />
          </Field>
          <Field label={t("pedit.highlights")}>
            <div className="space-y-2">
              {form.highlights.map((h, i) => (
                <input
                  key={i}
                  className="input"
                  value={h}
                  onChange={(e) => setHighlight(i, e.target.value)}
                  placeholder={t("pedit.highlightPh")}
                />
              ))}
            </div>
          </Field>
          <Field label={t("pedit.hours")}>
            <input className="input" value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder={t("pedit.hoursPh")} />
          </Field>
        </div>
      </Section>

      {/* Location */}
      <Section icon={MapPin} title={t("pedit.locationTitle")} hint={t("pedit.locationHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("pedit.address")}>
            <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t("pedit.addressPh")} />
          </Field>
          <Field label={t("pedit.city")}>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder={t("pedit.cityPh")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("pedit.mapQuery")}>
              <input className="input" value={form.mapQuery} onChange={(e) => set("mapQuery", e.target.value)} placeholder={t("pedit.mapQueryPh")} />
              <p className="mt-1 text-xs text-slate-400">{t("pedit.mapQueryHint")}</p>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("pedit.pinLabel")}>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={geoQuery}
                  onChange={(e) => {
                    setGeoQuery(e.target.value);
                    setGeoError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchPlace(e);
                  }}
                  placeholder={t("pedit.pinSearchPh")}
                />
                <button
                  type="button"
                  onClick={searchPlace}
                  disabled={geoBusy}
                  className="btn-outline shrink-0 disabled:opacity-60"
                >
                  {geoBusy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {t("pedit.pinSearch")}
                </button>
              </div>
              {geoError && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{t(geoError)}</p>
              )}
              <ClinicMap
                editable
                lat={form.lat}
                lng={form.lng}
                onChange={({ lat, lng }) => {
                  setForm((f) => ({ ...f, lat, lng }));
                  setSaved(false);
                }}
                className="relative z-0 mt-3 h-72 w-full overflow-hidden rounded-xl border border-slate-200"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400">{t("pedit.pinHint")}</p>
                {Number.isFinite(form.lat) && Number.isFinite(form.lng) && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, lat: null, lng: null }));
                      setSaved(false);
                    }}
                    className="btn-ghost shrink-0 text-xs text-rose-600"
                  >
                    <X size={14} /> {t("pedit.pinClear")}
                  </button>
                )}
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Photos */}
      <Section icon={ImageIcon} title={t("pedit.photosTitle")} hint={t("pedit.photosHint")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMAGE_FIELDS.map((field) => (
            <ImageField
              key={field.key}
              field={field}
              value={form.images[field.key] || ""}
              ownerId={clinic.ownerId}
              onChange={(url) => setImage(field.key, url)}
              t={t}
            />
          ))}
        </div>
      </Section>

      {/* Services */}
      <Section icon={Sparkles} title={t("pedit.servicesTitle")} hint={t("pedit.servicesHint")}>
        <div className="space-y-3">
          {form.services.length === 0 && (
            <p className="text-sm text-slate-500">{t("pedit.servicesEmpty")}</p>
          )}
          {form.services.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-start">
              <input
                className="input sm:w-1/3"
                value={s.name || ""}
                onChange={(e) => setService(i, "name", e.target.value)}
                placeholder={t("pedit.serviceNamePh")}
              />
              <input
                className="input flex-1"
                value={s.desc || ""}
                onChange={(e) => setService(i, "desc", e.target.value)}
                placeholder={t("pedit.serviceDescPh")}
              />
              <button
                type="button"
                onClick={() => removeService(i)}
                className="btn-ghost shrink-0 text-rose-600"
                title={t("pedit.remove")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {form.services.length < MAX_SERVICES && (
            <button type="button" onClick={addService} className="btn-outline text-sm">
              <Plus size={16} /> {t("pedit.addService")}
            </button>
          )}
        </div>
      </Section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:pl-64">
        <div className="flex items-center justify-between gap-3 md:px-4">
          <span className="text-sm text-slate-500">
            {error ? (
              <span className="font-medium text-rose-600">{t(error)}</span>
            ) : saved ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <Check size={16} /> {t("pedit.saved")}
              </span>
            ) : (
              t("pedit.unsaved")
            )}
          </span>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {t("pedit.save")}
          </button>
        </div>
      </div>
    </form>
  );
}
