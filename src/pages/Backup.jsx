import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Download,
  Upload,
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Database,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import { exportClinicData, restoreClinicData } from "../store/db.js";
import { backupToHtml, parseBackupFile } from "../lib/backupReport.js";

function slugifyForFile(value) {
  return (
    (value || "clinika")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "clinika"
  );
}

export default function Backup() {
  const { clinic, can, refreshClinic } = useAuth();
  const { t } = useLang();
  useSeo({ title: `${t("nav.backup")} | Clinika`, noindex: true });

  // Re-read the clinic on mount so the tier gate reflects the CURRENT plan,
  // not whatever was loaded at login (the plan can change mid-session).
  useEffect(() => {
    refreshClinic?.();
  }, [refreshClinic]);

  const allowed = can("dataBackup");
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreCounts, setRestoreCounts] = useState(null);

  function reportLabels() {
    return {
      title: t("backup.reportTitle"),
      exportedAt: t("backup.exportedAt"),
      patients: t("backup.lbl.clients"),
      appointments: t("backup.lbl.appointments"),
      inventory: t("backup.lbl.inventory"),
      locations: t("backup.lbl.locations"),
      treatments: t("backup.lbl.treatments"),
      consents: t("backup.lbl.consents"),
      name: t("backup.col.name"),
      phone: t("backup.col.phone"),
      email: t("backup.col.email"),
      created: t("backup.col.created"),
      date: t("backup.col.date"),
      patient: t("backup.col.patient"),
      reason: t("backup.col.reason"),
      duration: t("backup.col.duration"),
      status: t("backup.col.status"),
      category: t("backup.col.category"),
      quantity: t("backup.col.quantity"),
      reorder: t("backup.col.reorder"),
      supplier: t("backup.col.supplier"),
      address: t("backup.col.address"),
      hours: t("backup.col.hours"),
      schedule: t("backup.col.schedule"),
      customSchedule: t("backup.customSchedule"),
      simpleSchedule: t("backup.simpleSchedule"),
      services: t("backup.lbl.services"),
      description: t("backup.col.description"),
      scheduleIncluded: t("backup.scheduleIncluded"),
      tooth: t("backup.col.tooth"),
      procedure: t("backup.col.procedure"),
      signedBy: t("backup.col.signedBy"),
      note: t("backup.reportNote"),
    };
  }

  async function runBackup() {
    if (!clinic?.id) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const backup = await exportClinicData(clinic.id);
      const html = backupToHtml(backup, reportLabels());
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinika-backup-${slugifyForFile(clinic.slug || clinic.name)}-${stamp}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResult(backup);
    } catch (err) {
      console.error("Backup failed:", err);
      setError(err?.message || "backup.error");
    } finally {
      setBusy(false);
    }
  }

  async function onRestoreFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !clinic?.id) return;
    if (!window.confirm(t("backup.restoreConfirm"))) return;
    setRestoreBusy(true);
    setRestoreError("");
    setRestoreCounts(null);
    try {
      const backup = await parseBackupFile(file);
      const counts = await restoreClinicData(clinic.id, backup);
      setRestoreCounts(counts);
    } catch (err) {
      console.error("Restore failed:", err);
      setRestoreError(err?.message || "backup.restoreError");
    } finally {
      setRestoreBusy(false);
    }
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("backup.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("backup.subtitle")}</p>
        </div>
        <div className="card p-8 text-center dark:bg-slate-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <Lock size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("backup.lockTitle")}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {t("backup.lockBody")}
          </p>
          <Link to="/app/settings" className="btn-primary mt-5">
            <Sparkles size={16} /> {t("loc.lockCta")}
          </Link>
        </div>
      </div>
    );
  }

  const rows = result
    ? [
        { key: "clients", count: result.counts.patients },
        { key: "appointments", count: result.counts.appointments },
        { key: "inventory", count: result.counts.inventory },
        { key: "locations", count: result.counts.locations },
        { key: "treatments", count: result.counts.treatments },
        { key: "consents", count: result.counts.consents },
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("backup.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("backup.subtitle")}</p>
      </div>

      {/* Create a backup */}
      <div className="card p-6 dark:bg-slate-900">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-700">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("backup.cardTitle")}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t("backup.cardBody")}</p>
          </div>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            "backup.itemClients",
            "backup.itemAppointments",
            "backup.itemInventory",
            "backup.itemLocations",
            "backup.itemRecords",
            "backup.itemProfile",
          ].map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
            >
              <CheckCircle2 size={15} className="shrink-0 text-brand-500" />
              {t(key)}
            </li>
          ))}
        </ul>

        <button onClick={runBackup} disabled={busy} className="btn-primary mt-6 disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {busy ? t("backup.working") : t("backup.download")}
        </button>

        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertTriangle size={15} /> {t(error) || error}
          </p>
        )}

        {result && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} /> {t("backup.done")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rows.map((r) => (
                <div
                  key={r.key}
                  className="rounded-xl bg-white/70 px-3 py-2 text-center dark:bg-slate-900/40"
                >
                  <p className="text-lg font-bold leading-none text-slate-900 dark:text-white">
                    {r.count}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {t(`backup.lbl.${r.key}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restore from a backup */}
      <div className="card mt-5 p-6 dark:bg-slate-900">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-700">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <RotateCcw size={22} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("backup.restoreTitle")}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t("backup.restoreBody")}</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".html,.json,text/html,application/json"
          className="hidden"
          onChange={onRestoreFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={restoreBusy}
          className="btn-outline mt-5 disabled:opacity-60"
        >
          {restoreBusy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {restoreBusy ? t("backup.restoreWorking") : t("backup.restoreCta")}
        </button>

        <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {t("backup.restoreWarn")}
        </p>

        {restoreError && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertTriangle size={15} /> {t(restoreError) || restoreError}
          </p>
        )}

        {restoreCounts && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} /> {t("backup.restoreDone")}
            </p>
            <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
              {t("backup.restoreReloadHint")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              <RotateCcw size={16} /> {t("backup.reloadNow")}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        <Database size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p>{t("backup.note")}</p>
      </div>
    </div>
  );
}
