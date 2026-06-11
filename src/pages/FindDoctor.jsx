import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import {
  Stethoscope,
  Home,
  Search,
  MapPin,
  CalendarPlus,
  ArrowRight,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import { listClinics } from "../store/db.js";
import { isPaidClinic } from "../lib/plans.js";
import LanguageToggle from "../components/LanguageToggle.jsx";

// Great-circle distance (km) between two {lat, lng} points.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clinicDistanceKm(clinic, userLoc) {
  if (!userLoc) return Infinity;
  const lat = Number(clinic.profile?.lat);
  const lng = Number(clinic.profile?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  return haversineKm(userLoc, { lat, lng });
}

export default function FindDoctor() {
  const { t } = useLang();
  useSeo({ title: t("seo.findTitle"), description: t("seo.findDesc"), path: "/find" });
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [userLoc, setUserLoc] = useState(null);
  const [located, setLocated] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listClinics()
      .then((rows) => {
        if (active) setClinics(rows);
      })
      .catch((err) => console.error("Could not load clinics:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Ask the browser for the patient's location so we can surface the nearest
  // clinics first. If they decline (or it fails), we silently fall back to the
  // default ordering — the page still works.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocated(true);
      },
      () => setLocated(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? clinics.filter((c) =>
          [c.name, c.specialty, c.clinic, c.city]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        )
      : clinics;

    // Rank: paying clinics first (never shown as such to patients), then by
    // proximity to the patient when we know their location. Array.sort is
    // stable, so equal entries keep their original (creation) order.
    return [...matches].sort((a, b) => {
      const paidDelta = (isPaidClinic(b.profile) ? 1 : 0) - (isPaidClinic(a.profile) ? 1 : 0);
      if (paidDelta !== 0) return paidDelta;
      if (userLoc) {
        const da = clinicDistanceKm(a, userLoc);
        const db = clinicDistanceKm(b, userLoc);
        if (da !== db) return da - db;
      }
      return 0;
    });
  }, [clinics, query, userLoc]);

  return (
    <div className="portal-scope min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="text-lg font-bold text-slate-900">Clinika</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="mr-1" />
            <Link to="/me" className="btn-ghost">
              <Home size={16} /> {t("find.myPortal")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("find.title")}</h1>
        <p className="mt-1 text-slate-500">
          {located && userLoc ? t("find.subNear") : t("find.sub")}
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 focus-within:border-portal-500">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("find.searchPh")}
          />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-slate-400">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search size={22} />
            </div>
            <p className="text-sm text-slate-500">{t("find.empty")}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((c) => {
              const photo = c.profile?.images?.doctor;
              const distKm = userLoc ? clinicDistanceKm(c, userLoc) : Infinity;
              const showDist = Number.isFinite(distKm);
              return (
                <div key={c.id} className="card flex flex-col p-5">
                  <div className="flex items-center gap-3">
                    {photo ? (
                      <img
                        src={photo}
                        alt={c.name}
                        className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-portal-100 text-portal-700">
                        <Stethoscope size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{c.name}</p>
                      {(c.specialty || c.clinic) && (
                        <p className="truncate text-sm text-slate-500">
                          {c.specialty || c.clinic}
                        </p>
                      )}
                      {(c.clinic || c.city) && (
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                          <MapPin size={12} />
                          {[c.clinic, c.city].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {showDist && (
                      <span className="shrink-0 self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        {t("find.kmAway", {
                          km: distKm < 10 ? distKm.toFixed(1) : Math.round(distKm),
                        })}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link to={`/c/${c.slug}`} className="btn-outline flex-1 text-sm">
                      {t("app.navProfile")}
                    </Link>
                    <Link to={`/c/${c.slug}/book`} className="btn-primary flex-1 text-sm">
                      <CalendarPlus size={15} /> {t("patient.bookNew")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/me" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            {t("find.backPortal")} <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}
