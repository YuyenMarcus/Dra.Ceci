import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Clock,
  Ban,
  CheckCircle2,
  CalendarPlus,
  Handshake,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ShieldCheck,
  BarChart3,
  Flag,
  ExternalLink,
  Star,
  MessageSquareHeart,
  EyeOff,
  Tag,
  Copy,
  Trash2,
  Plus,
  Power,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import {
  adminOverview,
  adminGrowth,
  adminTimeseries,
  adminUpdateClinic,
  adminReports,
  adminResolveReport,
  adminTestimonials,
  adminSetTestimonialStatus,
  adminAffiliates,
  adminSaveAffiliate,
  adminDeleteAffiliate,
} from "../store/db.js";
import TrendChart from "../components/ui/trend-chart.jsx";
import { ThemeToggle } from "../theme/ThemeContext.jsx";
import { PLANS, getPlan } from "../lib/plans.js";
import { formatDate, relativeDay } from "../lib/format.js";
import BrandMark from "../components/BrandMark.jsx";

// Commission paid to the referral partner, as a share of the clinic's monthly
// price, for partner-referred clinics that are actively paying. Adjust here.
const PARTNER_COMMISSION_PCT = 0.2;

const REFERRAL_SOURCES = ["organic", "partner", "ad", "wordOfMouth"];

const DAY_MS = 86400000;

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
}

// Active = paying (manual comp or Stripe). Trial = within the trial window and
// not yet converted. Inactive = suspended or an expired trial that never paid.
function statusOf(row) {
  if (row.suspended) return "inactive";
  if (row.billing === "manual" || row.billing === "stripe") return "active";
  const left = daysUntil(row.trialEndsAt);
  if (left !== null) return left > 0 ? "trial" : "inactive";
  return "trial";
}

function money(n) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function StatCard({ icon: Icon, label, value, sub, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{sub}</p>}
    </div>
  );
}

// One growth metric with an optional month-over-month delta. `invert` flips the
// good/bad coloring (more churn is bad, more signups is good).
function GrowthStat({ icon: Icon, label, value, prev, hint, invert = false }) {
  const hasDelta = typeof prev === "number";
  const delta = hasDelta ? value - prev : 0;
  const up = delta > 0;
  const good = invert ? !up : up;
  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {Icon && <Icon size={12} />} {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {hasDelta && delta !== 0 ? (
        <p
          className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${
            good ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(delta)} {/* vs last month */}
        </p>
      ) : (
        hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    trial: "bg-amber-50 text-amber-700 ring-amber-600/15",
    inactive: "bg-rose-50 text-rose-700 ring-rose-600/15",
  };
  const dot = {
    active: "bg-emerald-500",
    trial: "bg-amber-500",
    inactive: "bg-rose-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {t(`admin.status.${status}`)}
    </span>
  );
}

function ChartCard({ title, value, children }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <p className="text-lg font-bold tracking-tight text-slate-900">{value}</p>
      </div>
      {children}
    </div>
  );
}

// Tinted initials tile so rows are easy to tell apart at a glance.
function ClinicAvatar({ name }) {
  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
      {initials}
    </span>
  );
}

function AffiliatesPanel({ t, stats, totalCommission, onSave, onDelete, money }) {
  const blank = { code: "", name: "", pct: 20, discount: 20, active: true };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (code) => `${origin}/signup?ref=${encodeURIComponent(code)}`;

  function edit(a) {
    setForm({
      code: a.code,
      name: a.name,
      pct: Math.round(a.commissionPct * 100),
      discount: Math.round((a.discountPct || 0) * 100),
      active: a.active,
    });
    setEditing(true);
  }

  async function submit(e) {
    e.preventDefault();
    const code = (form.code || "").replace(/\s/g, "").toUpperCase();
    if (!code) return;
    setBusy(true);
    const ok = await onSave({
      code,
      name: form.name,
      commissionPct: Math.max(0, Math.min(100, Number(form.pct) || 0)) / 100,
      discountPct: Math.max(0, Math.min(100, Number(form.discount) || 0)) / 100,
      active: form.active,
    });
    setBusy(false);
    if (ok) {
      setForm(blank);
      setEditing(false);
    }
  }

  function copy(code) {
    navigator.clipboard?.writeText(linkFor(code)).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <section className="card mt-6 p-5 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <Handshake size={18} className="text-brand-600" /> {t("admin.affiliates.title")}
        </h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t("admin.affiliates.totalOwed", { amount: money(totalCommission) })}
        </span>
      </div>

      {/* Add / edit a code */}
      <form
        onSubmit={submit}
        className="mb-5 grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
      >
        <input
          className="input uppercase"
          placeholder={t("admin.affiliates.codePh")}
          value={form.code}
          disabled={editing}
          onChange={(e) =>
            setForm((f) => ({ ...f, code: e.target.value.replace(/\s/g, "").toUpperCase() }))
          }
        />
        <input
          className="input"
          placeholder={t("admin.affiliates.namePh")}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-800">
          <input
            className="w-16 bg-transparent py-2.5 text-sm outline-none"
            type="number"
            min={0}
            max={100}
            value={form.pct}
            onChange={(e) => setForm((f) => ({ ...f, pct: e.target.value }))}
          />
          <span className="text-sm text-slate-400">% {t("admin.affiliates.perMonth")}</span>
        </div>
        <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-800">
          <input
            className="w-16 bg-transparent py-2.5 text-sm outline-none"
            type="number"
            min={0}
            max={100}
            value={form.discount}
            onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
          />
          <span className="text-sm text-slate-400">% {t("admin.affiliates.firstMonthOff")}</span>
        </div>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          <Plus size={16} /> {editing ? t("common.save") : t("admin.affiliates.add")}
        </button>
      </form>

      {stats.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{t("admin.affiliates.empty")}</p>
      ) : (
        <div className="space-y-2">
          {stats.map((a) => (
            <div
              key={a.code}
              className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                a.active
                  ? "border-slate-200 dark:border-slate-700"
                  : "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/40"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 font-mono text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <Tag size={13} /> {a.code}
                  </span>
                  {a.name && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.name}</span>}
                  {!a.active && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
                      {t("admin.affiliates.inactive")}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{t("admin.affiliates.referred", { n: a.referredCount })}</span>
                  <span>{t("admin.affiliates.paying", { n: a.payingCount })}</span>
                  <span>{t("admin.affiliates.trialing", { n: a.trialCount })}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("admin.affiliates.owed", {
                      amount: money(a.monthlyCommission),
                      pct: Math.round(a.commissionPct * 100),
                    })}
                  </span>
                  {a.discountPct > 0 && (
                    <span className="text-brand-600 dark:text-brand-300">
                      {t("admin.affiliates.discount", {
                        pct: Math.round(a.discountPct * 100),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="btn-ghost px-2.5 py-2 text-xs"
                  onClick={() => copy(a.code)}
                  title={t("admin.affiliates.copyLink")}
                >
                  {copied === a.code ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
                <button
                  className="btn-ghost px-2.5 py-2 text-xs"
                  onClick={() => edit(a)}
                  title={t("common.edit")}
                >
                  {t("common.edit")}
                </button>
                <button
                  className="btn-ghost px-2.5 py-2 text-xs"
                  onClick={() =>
                    onSave({
                      code: a.code,
                      name: a.name,
                      commissionPct: a.commissionPct,
                      discountPct: a.discountPct,
                      active: !a.active,
                    })
                  }
                  title={a.active ? t("admin.affiliates.deactivate") : t("admin.affiliates.activate")}
                >
                  <Power size={15} className={a.active ? "text-emerald-600" : "text-slate-400"} />
                </button>
                <button
                  className="btn-ghost px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => onDelete(a.code)}
                  title={t("common.delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Admin() {
  const { t, lang } = useLang();
  useSeo({ title: "Admin | Clinika", noindex: true });
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [ts, setTs] = useState(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, g, reps, tms, affs] = await Promise.all([
        adminOverview(),
        adminGrowth(),
        adminReports(),
        adminTestimonials(),
        adminAffiliates(),
      ]);
      setRows(overview);
      setGrowth(g);
      setReports(reps);
      setTestimonials(tms);
      setAffiliates(affs);
    } catch (err) {
      console.error(err);
      setError(err?.message || "admin.loadError");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Chart data reloads independently when the range toggle changes.
  useEffect(() => {
    if (!isAdmin) return undefined;
    let on = true;
    adminTimeseries(range).then((d) => {
      if (on) setTs(d);
    });
    return () => {
      on = false;
    };
  }, [isAdmin, range]);

  // Apply a profile patch to one clinic, optimistically updating the row.
  const patch = useCallback(async (id, p) => {
    setBusyId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const res = await adminUpdateClinic(id, p);
    if (!res.ok) {
      setError(res.error || "admin.saveError");
      await load();
    }
    setBusyId(null);
  }, [load]);

  const setPlan = (id, plan) =>
    patch(id, { plan, billing: "manual", suspended: false });
  const activate = (id) => patch(id, { billing: "manual", suspended: false });
  const suspend = (id) => patch(id, { suspended: true });
  const unsuspend = (id) => patch(id, { suspended: false });
  const extendTrial = (row) => {
    const base = Math.max(Date.now(), new Date(row.trialEndsAt || 0).getTime() || 0);
    const next = new Date(base + 14 * DAY_MS).toISOString();
    patch(row.id, { trialEndsAt: next, billing: "", suspended: false });
  };
  const setReferral = (id, referralSource) => patch(id, { referralSource });

  // Triage a report: optimistically update its status, roll back on failure.
  const resolveReport = useCallback(async (id, status) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await adminResolveReport(id, status);
    if (!res?.ok) {
      setError(res?.error || "admin.saveError");
      const reps = await adminReports();
      setReports(reps);
    }
  }, []);

  const openReports = useMemo(
    () => reports.filter((r) => r.status === "open"),
    [reports]
  );

  // Curate testimonials: optimistic status update, roll back on failure.
  const setTestimonialStatus = useCallback(async (id, status) => {
    setTestimonials((prev) => prev.map((tm) => (tm.id === id ? { ...tm, status } : tm)));
    const res = await adminSetTestimonialStatus(id, status);
    if (!res?.ok) {
      setError(res?.error || "admin.saveError");
      const tms = await adminTestimonials();
      setTestimonials(tms);
    }
  }, []);

  const avgRating = useMemo(() => {
    if (testimonials.length === 0) return 0;
    return testimonials.reduce((s, tm) => s + (tm.rating || 0), 0) / testimonials.length;
  }, [testimonials]);

  // Per-affiliate stats: how many clinics each code referred, how many are
  // actively paying (Stripe), and the recurring monthly commission owed
  // (commission % of each paying referral's monthly plan price). Manual comps
  // are excluded from commission since no revenue is collected.
  const affiliateStats = useMemo(() => {
    return affiliates.map((a) => {
      const referred = rows.filter((r) => (r.referralCode || "") === a.code);
      const paying = referred.filter((r) => r.billing === "stripe" && !r.suspended);
      const trialing = referred.filter((r) => statusOf(r) === "trial");
      const monthlyCommission = paying.reduce(
        (s, r) => s + getPlan(r.plan).price * a.commissionPct,
        0
      );
      return {
        ...a,
        referredCount: referred.length,
        payingCount: paying.length,
        trialCount: trialing.length,
        monthlyCommission,
      };
    });
  }, [affiliates, rows]);

  const totalAffiliateCommission = useMemo(
    () => affiliateStats.reduce((s, a) => s + a.monthlyCommission, 0),
    [affiliateStats]
  );

  const saveAffiliate = useCallback(
    async (payload) => {
      const res = await adminSaveAffiliate(payload);
      if (!res.ok) {
        setError(res.error || "admin.saveError");
        return false;
      }
      setAffiliates(await adminAffiliates());
      return true;
    },
    []
  );

  const removeAffiliate = useCallback(async (code) => {
    setAffiliates((prev) => prev.filter((a) => a.code !== code));
    const res = await adminDeleteAffiliate(code);
    if (!res.ok) {
      setError(res.error || "admin.saveError");
      setAffiliates(await adminAffiliates());
    }
  }, []);

  // Derived business metrics. Real MRR only counts Stripe-billed clinics;
  // manually-set (comped) plans are tracked separately so revenue is honest.
  const stats = useMemo(() => {
    const withStatus = rows.map((r) => ({ ...r, _status: statusOf(r) }));
    const active = withStatus.filter((r) => r._status === "active");
    const trial = withStatus.filter((r) => r._status === "trial");
    const inactive = withStatus.filter((r) => r._status === "inactive");
    const priceOf = (r) => getPlan(r.plan).price;

    const paying = active.filter((r) => r.billing === "stripe");
    const manual = active.filter((r) => r.billing === "manual");
    const mrr = paying.reduce((s, r) => s + priceOf(r), 0);
    const manualMrr = manual.reduce((s, r) => s + priceOf(r), 0);
    const lostMrr = inactive.reduce((s, r) => s + priceOf(r), 0);

    const byTier = {};
    for (const r of paying) byTier[r.plan] = (byTier[r.plan] || 0) + priceOf(r);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonth = rows.filter((r) => new Date(r.createdAt) >= monthStart).length;

    // Commission is owed on collected revenue only, so manual comps don't count.
    const partnerActive = paying.filter((r) => r.referralSource === "partner");
    const commission = partnerActive.reduce(
      (s, r) => s + priceOf(r) * PARTNER_COMMISSION_PCT,
      0
    );

    // Engagement = most recent of last login OR last product event.
    const lastActive = (r) =>
      Math.max(
        r.lastSignInAt ? new Date(r.lastSignInAt).getTime() : 0,
        r.lastEventAt ? new Date(r.lastEventAt).getTime() : 0
      );
    const atRisk = withStatus.filter((r) => {
      if (r._status === "inactive") return false;
      const seen = lastActive(r);
      return !seen || Date.now() - seen > 7 * DAY_MS;
    }).length;

    return {
      withStatus,
      mrr,
      manualMrr,
      manualCount: manual.length,
      payingCount: paying.length,
      lostMrr,
      byTier,
      active: active.length,
      trial: trial.length,
      inactive: inactive.length,
      newThisMonth,
      arpu: paying.length ? mrr / paying.length : 0,
      commission,
      partnerCount: partnerActive.length,
      atRisk,
    };
  }, [rows]);

  // Chart series derived from the daily timeseries: cumulative totals for
  // clinics + MRR, daily bars for signups and active clinics.
  const charts = useMemo(() => {
    const series = ts?.series;
    if (!Array.isArray(series) || series.length === 0) return null;
    const labels = series.map((p) =>
      new Date(`${p.d}T00:00:00`).toLocaleDateString(
        lang === "es" ? "es-ES" : "en-US",
        { day: "numeric", month: "short" }
      )
    );
    let total = Number(ts.baseClinics) || 0;
    const totalClinics = series.map((p) => (total += Number(p.signups) || 0));
    let runMrr = Number(ts.baseMrr) || 0;
    const mrr = series.map(
      (p) => (runMrr = Math.max(0, runMrr + (Number(p.newMrr) || 0) - (Number(p.lostMrr) || 0)))
    );
    return {
      labels,
      totalClinics,
      mrr,
      signups: series.map((p) => Number(p.signups) || 0),
      signupsSum: series.reduce((s, p) => s + (Number(p.signups) || 0), 0),
      active: series.map((p) => Number(p.active) || 0),
    };
  }, [ts, lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stats.withStatus.filter((r) => {
      if (statusFilter !== "all" && r._status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.ownerEmail?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q)
      );
    });
  }, [stats.withStatus, query, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dark operator header, matching the portal sidebar branding */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-brand-950 via-slate-900 to-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3.5">
          <BrandMark size={36} />
          <div className="mr-auto">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{t("admin.title")}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-200 ring-1 ring-brand-400/30">
                <ShieldCheck size={11} /> Admin
              </span>
            </div>
            <p className="text-xs text-brand-100/60">{t("admin.subtitle")}</p>
          </div>
          <ThemeToggle className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10" />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{t("admin.refresh")}</span>
          </button>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{t("admin.backToApp")}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle size={16} /> {t(error)}
          </div>
        )}

        {/* Business overview */}
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t("admin.overview")}
        </p>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            tone="emerald"
            label={t("admin.mrr")}
            value={money(stats.mrr)}
            sub={
              <>
                {PLANS.map((p) => `${p.name}: ${money(stats.byTier[p.id] || 0)}`).join("  ·  ")}
                {stats.manualCount > 0 && (
                  <span className="mt-0.5 block font-medium text-amber-600">
                    {t("admin.mrrManual", { v: money(stats.manualMrr), n: stats.manualCount })}
                  </span>
                )}
              </>
            }
          />
          <StatCard
            icon={Users}
            label={t("admin.activeClinics")}
            value={stats.active}
            sub={t("admin.activeSplit", {
              s: stats.payingCount,
              m: stats.manualCount,
              v: money(stats.arpu),
            })}
          />
          <StatCard
            icon={Clock}
            tone="amber"
            label={t("admin.trials")}
            value={stats.trial}
            sub={t("admin.newThisMonth", { v: stats.newThisMonth })}
          />
          <StatCard
            icon={Ban}
            tone="rose"
            label={t("admin.churned")}
            value={stats.inactive}
            sub={t("admin.lostMrr", { v: money(stats.lostMrr) })}
          />
          <StatCard
            icon={Handshake}
            label={t("admin.partnerCommission")}
            value={money(stats.commission)}
            sub={t("admin.partnerActive", {
              n: stats.partnerCount,
              pct: Math.round(PARTNER_COMMISSION_PCT * 100),
            })}
          />
          <StatCard
            icon={AlertTriangle}
            tone="amber"
            label={t("admin.churnRisk")}
            value={stats.atRisk}
            sub={t("admin.churnRiskHint")}
          />
        </section>

        {/* Growth (time-based; needs billing_events + app_events from 0008) */}
        {growth && (
          <section className="card mt-4 p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp size={16} className="text-brand-600" />
                {t("admin.growthTitle")}
              </h2>
              <p className="text-xs text-slate-400">{t("admin.growthSub")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <GrowthStat
                label={t("admin.gSignups")}
                value={growth.signupsThis ?? 0}
                prev={growth.signupsLast ?? 0}
              />
              <GrowthStat
                label={t("admin.gConversions")}
                value={growth.subscribedThis ?? 0}
                prev={growth.subscribedLast ?? 0}
              />
              <GrowthStat
                label={t("admin.gChurned")}
                value={growth.churnedThis ?? 0}
                prev={growth.churnedLast ?? 0}
                invert
              />
              <GrowthStat
                label={t("admin.gNewMrr")}
                value={money(growth.newMrrThis ?? 0)}
              />
              <GrowthStat
                label={t("admin.gLostMrr")}
                value={money(growth.lostMrrThis ?? 0)}
              />
              <GrowthStat
                icon={Activity}
                label={t("admin.gActive7d")}
                value={growth.activeClinics7d ?? 0}
                hint={t("admin.gPortalLogins", { n: growth.portalLoginsThis ?? 0 })}
              />
            </div>
          </section>
        )}

        {/* Trend charts (needs admin_timeseries from 0009) */}
        {charts && (
          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 size={16} className="text-brand-600" />
                {t("admin.trendsTitle")}
              </h2>
              <div className="flex gap-1.5">
                {[30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRange(d)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      range === d
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t("admin.rangeDays", { n: d })}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title={t("admin.cTotalClinics")}
                value={charts.totalClinics.at(-1) ?? 0}
              >
                <TrendChart
                  points={charts.totalClinics}
                  labels={charts.labels}
                  type="area"
                />
              </ChartCard>
              <ChartCard title={t("admin.cMrr")} value={money(charts.mrr.at(-1) ?? 0)}>
                <TrendChart
                  points={charts.mrr}
                  labels={charts.labels}
                  type="area"
                  color="#059669"
                  format={money}
                />
              </ChartCard>
              <ChartCard title={t("admin.cSignups")} value={charts.signupsSum}>
                <TrendChart points={charts.signups} labels={charts.labels} type="bar" />
              </ChartCard>
              <ChartCard
                title={t("admin.cActive")}
                value={charts.active.at(-1) ?? 0}
              >
                <TrendChart
                  points={charts.active}
                  labels={charts.labels}
                  type="bar"
                  color="#6366f1"
                />
              </ChartCard>
            </div>
          </section>
        )}

        {/* Affiliate / referral codes (needs affiliates from 0014) */}
        <AffiliatesPanel
          t={t}
          stats={affiliateStats}
          totalCommission={totalAffiliateCommission}
          onSave={saveAffiliate}
          onDelete={removeAffiliate}
          money={money}
        />

        {/* Reported profiles (needs clinic_reports from 0010) */}
        {reports.length > 0 && (
          <section className="card mt-6 overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Flag size={16} className="text-rose-500" />
                {t("admin.reports.title")}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-600/15">
                {t("admin.reports.openCount", { n: openReports.length })}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <li
                  key={rep.id}
                  className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${
                    rep.status !== "open" ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/c/${rep.clinicSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-brand-600"
                      >
                        {rep.clinicName} <ExternalLink size={12} />
                      </Link>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        {rep.reason}
                      </span>
                      {rep.status !== "open" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t(`admin.reports.status.${rep.status}`)}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{relativeDay(rep.createdAt)}</span>
                    </div>
                    {rep.details && (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{rep.details}</p>
                    )}
                    {rep.reporter && (
                      <p className="mt-1 text-xs text-slate-400">
                        {t("admin.reports.reporter", { c: rep.reporter })}
                      </p>
                    )}
                  </div>
                  {rep.status === "open" && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => resolveReport(rep.id, "reviewed")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 size={13} /> {t("admin.reports.markReviewed")}
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveReport(rep.id, "dismissed")}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        <Ban size={13} /> {t("admin.reports.dismiss")}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Testimonials (needs app_testimonials from 0011) */}
        {testimonials.length > 0 && (
          <section className="card mt-6 overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MessageSquareHeart size={16} className="text-brand-600" />
                {t("admin.testimonials.title")}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/15">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)} · {t("admin.testimonials.count", { n: testimonials.length })}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {testimonials.map((tm) => (
                <li
                  key={tm.id}
                  className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${
                    tm.status === "hidden" ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            className={
                              n <= tm.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }
                          />
                        ))}
                      </span>
                      {tm.clinicSlug ? (
                        <Link
                          to={`/c/${tm.clinicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-brand-600"
                        >
                          {tm.displayName || tm.clinicSlug} <ExternalLink size={12} />
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-slate-900">
                          {tm.displayName || "—"}
                        </span>
                      )}
                      {tm.status === "approved" && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {t("admin.testimonials.status.approved")}
                        </span>
                      )}
                      {tm.status === "hidden" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t("admin.testimonials.status.hidden")}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{relativeDay(tm.createdAt)}</span>
                    </div>
                    {tm.comment && (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                        “{tm.comment}”
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {tm.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => setTestimonialStatus(tm.id, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 size={13} /> {t("admin.testimonials.approve")}
                      </button>
                    )}
                    {tm.status !== "hidden" ? (
                      <button
                        type="button"
                        onClick={() => setTestimonialStatus(tm.id, "hidden")}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        <EyeOff size={13} /> {t("admin.testimonials.hide")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTestimonialStatus(tm.id, "new")}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        {t("admin.testimonials.restore")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Clinics */}
        <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("admin.clinics")}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t("admin.clinicsSub")}</p>
          </div>
          <p className="text-xs font-medium text-slate-400">
            {t("admin.showing", { n: filtered.length, total: rows.length })}
          </p>
        </div>

        <div className="card overflow-hidden p-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3.5">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white"
              />
            </div>
            <div className="flex gap-1.5">
              {["all", "active", "trial", "inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    statusFilter === s
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t(`admin.filter.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">{t("admin.col.clinic")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.plan")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.trial")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.lastLogin")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.usage")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.referral")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      {t("admin.loading")}
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      {t("admin.empty")}
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((r) => {
                    const left = daysUntil(r.trialEndsAt);
                    return (
                      <tr
                        key={r.id}
                        className={`align-top transition hover:bg-slate-50/60 ${
                          busyId === r.id ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <ClinicAvatar name={r.name} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{r.name}</p>
                              <p className="truncate text-xs text-slate-500">{r.ownerEmail}</p>
                              <p className="truncate text-xs text-slate-400">
                                /{r.slug}
                                {r.city ? ` · ${r.city}` : ""} · {formatDate(r.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={r.plan}
                            onChange={(e) => setPlan(r.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400"
                          >
                            {PLANS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · ${p.price}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r._status} t={t} />
                          {r._status === "active" && r.billing === "manual" && (
                            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                              {t("admin.manualTag")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {left === null ? (
                            <span className="text-slate-400">—</span>
                          ) : left > 0 ? (
                            <span className={left <= 5 ? "font-semibold text-amber-600" : "text-slate-600"}>
                              {t("admin.daysLeft", { n: left })}
                            </span>
                          ) : (
                            <span className="font-semibold text-rose-600">
                              {t("admin.trialExpired")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.lastSignInAt ? relativeDay(r.lastSignInAt) : (
                            <span className="text-slate-400">{t("admin.never")}</span>
                          )}
                          {r.lastEventAt && (
                            <div className="text-xs text-slate-400">
                              {t("admin.lastActive", { d: relativeDay(r.lastEventAt) })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div>{t("admin.usageAppts", { m: r.apptThisMonth, total: r.apptCount })}</div>
                          <div className="text-slate-400">
                            {t("admin.usagePatients", { n: r.patientCount })} ·{" "}
                            {t("admin.usageInventory", { n: r.inventoryCount })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={REFERRAL_SOURCES.includes(r.referralSource) ? r.referralSource : "organic"}
                            onChange={(e) => setReferral(r.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                          >
                            {REFERRAL_SOURCES.map((s) => (
                              <option key={s} value={s}>
                                {t(`admin.ref.${s}`)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => extendTrial(r)}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                              title={t("admin.extendTrial")}
                            >
                              <CalendarPlus size={13} /> +14d
                            </button>
                            {r.suspended ? (
                              <button
                                type="button"
                                onClick={() => unsuspend(r.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                <CheckCircle2 size={13} /> {t("admin.activate")}
                              </button>
                            ) : (
                              <>
                                {r._status !== "active" && (
                                  <button
                                    type="button"
                                    onClick={() => activate(r.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <CheckCircle2 size={13} /> {t("admin.activate")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => suspend(r.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                                >
                                  <Ban size={13} /> {t("admin.suspend")}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          {t("admin.footnote")}
        </p>
      </main>
    </div>
  );
}
