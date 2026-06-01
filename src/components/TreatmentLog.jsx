import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Lock, Eye, Package } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useStore } from "../store/StoreContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  loadTreatments,
  upsertTreatment,
  deleteTreatment,
  loadConsents,
  addConsent,
} from "../store/db.js";
import { PROCEDURES, procedureLabel, DEFAULT_CONSENT_BODY_ES, DEFAULT_CONSENT_BODY_EN } from "../lib/procedures.js";
import { TOOTH_OPTIONS } from "../lib/toothLabels.js";
import { ODONTO_STATUSES } from "../lib/ficha.js";
import { formatDate } from "../lib/format.js";
import Confirm from "./Confirm.jsx";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tx-${Date.now().toString(36)}`;
}

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  procedureKey: "checkup",
  procedureCustom: "",
  tooth: "",
  odontogramStatus: "",
  followUp: "",
  patientNote: "",
  privateNote: "",
  status: "completed",
  amount: "",
  paid: false,
  materials: [],
});

export default function TreatmentLog({ patient, onOdontogramPatch }) {
  const { t, lang } = useLang();
  const { currentUser, clinic } = useAuth();
  const { inventory, updateItem, updateClient } = useStore();
  const clinicId = clinic?.id;
  const patientId = patient?.id;

  const [entries, setEntries] = useState([]);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentForm, setConsentForm] = useState({
    procedure: "",
    body: lang === "en" ? DEFAULT_CONSENT_BODY_EN : DEFAULT_CONSENT_BODY_ES,
    signedName: patient?.name ?? "",
  });

  useEffect(() => {
    if (!clinicId || !patientId) return undefined;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [tx, cs] = await Promise.all([
          loadTreatments(clinicId, patientId),
          loadConsents(clinicId, patientId),
        ]);
        if (!active) return;
        setEntries(tx);
        setConsents(cs);
      } catch (err) {
        console.error("Could not load treatments:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clinicId, patientId]);

  const procedureText = useMemo(
    () =>
      procedureLabel(
        form.procedureKey,
        lang,
        form.procedureKey === "other" ? form.procedureCustom : ""
      ),
    [form.procedureKey, form.procedureCustom, lang]
  );

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(entry) {
    const match = PROCEDURES.find((p) => p.es === entry.procedure || p.en === entry.procedure);
    setEditingId(entry.id);
    setForm({
      date: entry.date?.slice(0, 10) || "",
      procedureKey: match?.key ?? "other",
      procedureCustom: match ? "" : entry.procedure,
      tooth: entry.tooth || "",
      odontogramStatus: entry.odontogramStatus || "",
      followUp: entry.followUp || "",
      patientNote: entry.patientNote || "",
      privateNote: entry.privateNote || "",
      status: entry.status || "completed",
      amount: entry.amount ? String(entry.amount) : "",
      paid: entry.paid,
      materials: entry.materials || [],
    });
    setFormOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!clinicId || !patientId || busy) return;
    setBusy(true);
    const payload = {
      id: editingId || newId(),
      clientId: patientId,
      date: form.date,
      provider: currentUser?.name || clinic?.name || "",
      tooth: form.tooth || "",
      procedure: procedureText,
      followUp: form.followUp,
      patientNote: form.patientNote,
      privateNote: form.privateNote,
      status: form.status,
      amount: parseFloat(form.amount) || 0,
      paid: form.paid,
      materials: form.materials.filter((m) => m.inventoryId && m.qty > 0),
      odontogramStatus: form.odontogramStatus || "",
    };
    try {
      await upsertTreatment(clinicId, payload);

      // Inventory deduction (only on new entries with materials)
      if (!editingId && payload.materials.length) {
        for (const mat of payload.materials) {
          const item = inventory.find((i) => i.id === mat.inventoryId);
          if (!item) continue;
          const nextQty = Math.max(0, Number(item.quantity) - Number(mat.qty));
          updateItem(item.id, { quantity: nextQty });
        }
      }

      // Odontogram auto-mark
      if (form.tooth && form.odontogramStatus && onOdontogramPatch) {
        onOdontogramPatch(form.tooth, form.odontogramStatus);
      } else if (form.tooth && form.odontogramStatus) {
        const odontograma = { ...(patient.odontograma || {}), [form.tooth]: form.odontogramStatus };
        updateClient(patientId, { odontograma });
      }

      const fresh = await loadTreatments(clinicId, patientId);
      setEntries(fresh);
      setFormOpen(false);
    } catch (err) {
      console.error("Could not save treatment:", err);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteTreatment(toDelete.id);
      setEntries((list) => list.filter((x) => x.id !== toDelete.id));
    } catch (err) {
      console.error(err);
    }
    setToDelete(null);
  }

  function addMaterialRow() {
    setForm((f) => ({
      ...f,
      materials: [...f.materials, { inventoryId: "", qty: 1 }],
    }));
  }

  function updateMaterial(i, patch) {
    setForm((f) => ({
      ...f,
      materials: f.materials.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));
  }

  async function saveConsent(e) {
    e.preventDefault();
    if (!clinicId || !patientId) return;
    try {
      const row = await addConsent(clinicId, {
        clientId: patientId,
        procedure: consentForm.procedure,
        body: consentForm.body,
        signedName: consentForm.signedName,
      });
      if (row) setConsents((list) => [row, ...list]);
      setConsentOpen(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{t("tx.logTitle")}</h3>
          <p className="text-xs text-slate-400">{t("tx.logHint")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={() => setConsentOpen(true)}>
            {t("tx.addConsent")}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={openAdd}>
            <Plus size={14} /> {t("tx.addProcedure")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          {t("tx.emptyDoctor")}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{entry.procedure}</p>
                  <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                  {entry.paid ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {t("tx.paid")}
                    </span>
                  ) : entry.amount > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      ${entry.amount.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                {entry.tooth && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("tx.tooth")}: {entry.tooth}
                  </p>
                )}
                {entry.patientNote && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                    <Eye size={13} className="mt-0.5 shrink-0 text-brand-500" />
                    {entry.patientNote}
                  </p>
                )}
                {entry.privateNote && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                    <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    {entry.privateNote}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-brand-600"
                  onClick={() => openEdit(entry)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => setToDelete(entry)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {consents.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("tx.consents")}
          </p>
          <ul className="space-y-2 text-sm">
            {consents.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                <span className="font-medium text-slate-800">{c.procedure || t("tx.consent")}</span>
                {" · "}
                {c.signedName} — {formatDate(c.signedAt)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h4 className="text-lg font-bold text-slate-900">
              {editingId ? t("tx.editProcedure") : t("tx.addProcedure")}
            </h4>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t("tx.date")}</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">{t("tx.status")}</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="completed">{t("tx.completed")}</option>
                  <option value="planned">{t("tx.planned")}</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="label">{t("tx.procedure")}</label>
              <select
                className="input"
                value={form.procedureKey}
                onChange={(e) => setForm((f) => ({ ...f, procedureKey: e.target.value }))}
              >
                {PROCEDURES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {lang === "en" ? p.en : p.es}
                  </option>
                ))}
              </select>
              {form.procedureKey === "other" && (
                <input
                  className="input mt-2"
                  placeholder={t("tx.procedureCustom")}
                  value={form.procedureCustom}
                  onChange={(e) => setForm((f) => ({ ...f, procedureCustom: e.target.value }))}
                  required
                />
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t("tx.tooth")}</label>
                <select
                  className="input"
                  value={form.tooth}
                  onChange={(e) => setForm((f) => ({ ...f, tooth: e.target.value }))}
                >
                  <option value="">{t("tx.noTooth")}</option>
                  {TOOTH_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      FDI {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t("tx.markOdontogram")}</label>
                <select
                  className="input"
                  value={form.odontogramStatus}
                  onChange={(e) => setForm((f) => ({ ...f, odontogramStatus: e.target.value }))}
                  disabled={!form.tooth}
                >
                  <option value="">{t("tx.noMark")}</option>
                  {ODONTO_STATUSES.filter((s) => s.key !== "none").map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-brand-700">
                <Eye size={13} /> {t("tx.visibleToPatient")}
              </p>
              <textarea
                className="input min-h-[72px]"
                placeholder={t("tx.patientNotePh")}
                value={form.patientNote}
                onChange={(e) => setForm((f) => ({ ...f, patientNote: e.target.value }))}
              />
              <input
                className="input mt-2"
                placeholder={t("tx.followUpPh")}
                value={form.followUp}
                onChange={(e) => setForm((f) => ({ ...f, followUp: e.target.value }))}
              />
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Lock size={13} /> {t("tx.privateOnly")}
              </p>
              <textarea
                className="input min-h-[72px]"
                placeholder={t("tx.privateNotePh")}
                value={form.privateNote}
                onChange={(e) => setForm((f) => ({ ...f, privateNote: e.target.value }))}
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("tx.amount")}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.paid}
                    onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
                  />
                  {t("tx.paid")}
                </label>
              </div>
            </div>

            {!editingId && inventory.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                  <Package size={13} /> {t("tx.materials")}
                </p>
                {form.materials.map((m, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <select
                      className="input flex-1"
                      value={m.inventoryId}
                      onChange={(e) => updateMaterial(i, { inventoryId: e.target.value })}
                    >
                      <option value="">{t("tx.pickMaterial")}</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="input w-20"
                      value={m.qty}
                      onChange={(e) => updateMaterial(i, { qty: Number(e.target.value) || 1 })}
                    />
                  </div>
                ))}
                <button type="button" className="btn-ghost text-xs" onClick={addMaterialRow}>
                  <Plus size={12} /> {t("tx.addMaterial")}
                </button>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form
            onSubmit={saveConsent}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h4 className="text-lg font-bold text-slate-900">{t("tx.consentTitle")}</h4>
            <div className="mt-3">
              <label className="label">{t("tx.procedure")}</label>
              <input
                className="input"
                required
                value={consentForm.procedure}
                onChange={(e) => setConsentForm((f) => ({ ...f, procedure: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <label className="label">{t("tx.consentBody")}</label>
              <textarea
                className="input min-h-[120px]"
                value={consentForm.body}
                onChange={(e) => setConsentForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <label className="label">{t("tx.signedName")}</label>
              <input
                className="input"
                required
                value={consentForm.signedName}
                onChange={(e) => setConsentForm((f) => ({ ...f, signedName: e.target.value }))}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setConsentOpen(false)}>
                {t("common.cancel")}
              </button>
              <button type="submit" className="btn-primary">
                {t("tx.saveConsent")}
              </button>
            </div>
          </form>
        </div>
      )}

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("tx.deleteTitle")}
        message={t("tx.deleteMsg")}
        confirmLabel={t("common.delete")}
      />
    </section>
  );
}
