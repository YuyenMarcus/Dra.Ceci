import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";

export default function CommissionCalculator() {
  const { t } = useLang();
  const [charge, setCharge] = useState("");
  const [lab, setLab] = useState("");
  const [materials, setMaterials] = useState("");
  const [commissionPct, setCommissionPct] = useState("30");

  const result = useMemo(() => {
    const total = parseFloat(charge) || 0;
    const labCost = parseFloat(lab) || 0;
    const matCost = parseFloat(materials) || 0;
    const pct = Math.min(100, Math.max(0, parseFloat(commissionPct) || 0));
    const net = total - labCost - matCost;
    const commission = net * (pct / 100);
    const clinicKeeps = net - commission;
    return { total, net, commission, clinicKeeps, pct };
  }, [charge, lab, materials, commissionPct]);

  const fmt = (n) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Calculator size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{t("commission.title")}</h2>
          <p className="text-sm text-slate-500">{t("commission.hint")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("commission.charge")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("commission.lab")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={lab}
            onChange={(e) => setLab(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("commission.materials")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("commission.pct")}</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            className="input"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-400">{t("commission.net")}</p>
          <p className="text-lg font-bold text-slate-900">${fmt(result.net)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">
            {t("commission.doctorShare", { pct: result.pct })}
          </p>
          <p className="text-lg font-bold text-brand-700">${fmt(result.commission)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{t("commission.clinicKeeps")}</p>
          <p className="text-lg font-bold text-emerald-700">${fmt(result.clinicKeeps)}</p>
        </div>
      </div>
    </div>
  );
}
