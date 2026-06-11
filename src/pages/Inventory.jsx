import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Minus,
  Pencil,
  Trash2,
  Boxes,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import Modal from "../components/Modal.jsx";
import Confirm from "../components/Confirm.jsx";
import Empty from "../components/Empty.jsx";
import { formatDate } from "../lib/format.js";

const emptyForm = {
  name: "",
  category: "PPE",
  sku: "",
  quantity: 0,
  unit: "units",
  reorderLevel: 5,
  supplier: "",
};

const categories = [
  "PPE",
  "Dental Materials",
  "Anesthetics",
  "Consumables",
  "Instruments",
  "Medication",
  "Other",
];

function stockStatus(item) {
  const q = Number(item.quantity);
  const r = Number(item.reorderLevel);
  if (q === 0) return { key: "inv.outOfStock", cls: "bg-rose-100 text-rose-700" };
  if (q <= r) return { key: "inv.lowStock", cls: "bg-amber-100 text-amber-700" };
  return { key: "inv.inStock", cls: "bg-emerald-100 text-emerald-700" };
}

export default function Inventory() {
  const { inventory, addItem, updateItem, removeItem, adjustQuantity } =
    useStore();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((i) => {
      const matchesQuery =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.supplier.toLowerCase().includes(q);
      const low = Number(i.quantity) <= Number(i.reorderLevel);
      const matchesFilter =
        filter === "all" || (filter === "low" && low) || filter === i.category;
      return matchesQuery && matchesFilter;
    });
  }, [inventory, query, filter]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item.id);
    setForm({ ...item });
    setModalOpen(true);
  }

  function save(e) {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
    };
    if (editing) updateItem(editing, payload);
    else addItem(payload);
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-10"
            placeholder={t("inv.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> {t("inv.addItem")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "low", ...categories].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {f === "all"
              ? t("inv.allItems")
              : f === "low"
              ? t("inv.needsRestock")
              : t(`inv.cat.${f}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon={Boxes}
          title={t("inv.noItems")}
          hint={t("inv.noItemsHint")}
          action={
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={18} /> {t("inv.addItem")}
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-semibold">{t("inv.colItem")}</th>
                  <th className="px-4 py-3 font-semibold">{t("inv.colCategory")}</th>
                  <th className="px-4 py-3 font-semibold">{t("inv.colStock")}</th>
                  <th className="px-4 py-3 font-semibold">{t("inv.colStatus")}</th>
                  <th className="px-4 py-3 font-semibold">{t("inv.colSupplier")}</th>
                  <th className="px-4 py-3 font-semibold">{t("inv.colUpdated")}</th>
                  <th className="px-6 py-3 text-right font-semibold">{t("inv.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {t(`inv.cat.${item.category}`)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => adjustQuantity(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                            disabled={Number(item.quantity) === 0}
                            aria-label={t("inv.decrease")}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-16 text-center font-semibold text-slate-800">
                            {item.quantity}
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              {item.unit}
                            </span>
                          </span>
                          <button
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                            aria-label={t("inv.increase")}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}
                        >
                          {t(status.key)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {item.supplier || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                            aria-label={t("clients.editFicha")}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setToDelete(item)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={t("common.delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("inv.editItem") : t("inv.addItemTitle")}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn-primary" form="item-form" type="submit">
              {editing ? t("inv.saveChanges") : t("inv.addItem")}
            </button>
          </>
        }
      >
        <form id="item-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label">{t("inv.itemName")}</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("inv.itemNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("inv.category")}</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{t(`inv.cat.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("inv.sku")}</label>
              <input
                className="input"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="GLV-NIT-M"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t("inv.quantity")}</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("inv.unit")}</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder={t("inv.unitPlaceholder")}
              />
            </div>
            <div>
              <label className="label">{t("inv.reorderAt")}</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">{t("inv.supplier")}</label>
            <input
              className="input"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              placeholder={t("inv.supplierPlaceholder")}
            />
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => removeItem(toDelete.id)}
        title={t("inv.deleteItem")}
        message={t("inv.deleteMsg", { name: toDelete?.name })}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
