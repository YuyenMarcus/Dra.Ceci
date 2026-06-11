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
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { adminOverview, adminGrowth, adminUpdateClinic } from "../store/db.js";
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
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
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
    active: "bg-emerald-50 text-emerald-700",
    trial: "bg-amber-50 text-amber-700",
    inactive: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[status]}`}>
      {t(`admin.status.${status}`)}
    </span>
  );
}

export default function Admin() {
  const { t, lang } = useLang();
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, g] = await Promise.all([adminOverview(), adminGrowth()]);
      setRows(overview);
      setGrowth(g);
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

  // Derived business metrics.
  const stats = useMemo(() => {
    const withStatus = rows.map((r) => ({ ...r, _status: statusOf(r) }));
    const active = withStatus.filter((r) => r._status === "active");
    const trial = withStatus.filter((r) => r._status === "trial");
    const inactive = withStatus.filter((r) => r._status === "inactive");
    const priceOf = (r) => getPlan(r.plan).price;
    const mrr = active.reduce((s, r) => s + priceOf(r), 0);
    const lostMrr = inactive.reduce((s, r) => s + priceOf(r), 0);

    const byTier = {};
    for (const r of active) byTier[r.plan] = (byTier[r.plan] || 0) + priceOf(r);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonth = rows.filter((r) => new Date(r.createdAt) >= monthStart).length;

    const partnerActive = active.filter((r) => r.referralSource === "partner");
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
      lostMrr,
      byTier,
      active: active.length,
      trial: trial.length,
      inactive: inactive.length,
      newThisMonth,
      arpu: active.length ? mrr / active.length : 0,
      commission,
      partnerCount: partnerActive.length,
      atRisk,
    };
  }, [rows]);

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
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
          <BrandMark size={34} />
          <div className="mr-auto">
            <h1 className="text-lg font-bold text-slate-900">{t("admin.title")}</h1>
            <p className="text-xs text-slate-500">{t("admin.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="btn-outline gap-1.5 text-sm"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {t("admin.refresh")}
          </button>
          <Link to="/app" className="btn-outline gap-1.5 text-sm">
            <ArrowLeft size={15} /> {t("admin.backToApp")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle size={16} /> {t(error)}
          </div>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            tone="emerald"
            label={t("admin.mrr")}
            value={money(stats.mrr)}
            sub={PLANS.map((p) => `${p.name}: ${money(stats.byTier[p.id] || 0)}`).join("  ·  ")}
          />
          <StatCard
            icon={Users}
            label={t("admin.activeClinics")}
            value={stats.active}
            sub={t("admin.arpu", { v: money(stats.arpu) })}
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
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingUp size={16} className="text-brand-600" />
              {t("admin.growthTitle")}
            </h2>
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

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.searchPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "active", "trial", "inactive"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  statusFilter === s
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t(`admin.filter.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Clinic table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
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
                        className={`align-top ${busyId === r.id ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.ownerEmail}</p>
                          <p className="text-xs text-slate-400">
                            /{r.slug}
                            {r.city ? ` · ${r.city}` : ""} · {formatDate(r.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={r.plan}
                            onChange={(e) => setPlan(r.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-400"
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
