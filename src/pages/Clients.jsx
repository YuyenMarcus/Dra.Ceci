import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Users,
  CalendarClock,
  FileText,
  Printer,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import Modal from "../components/Modal.jsx";
import Confirm from "../components/Confirm.jsx";
import Empty from "../components/Empty.jsx";
import FichaEditor from "../components/FichaEditor.jsx";
import FichaView from "../components/FichaView.jsx";
import TreatmentLog from "../components/TreatmentLog.jsx";
import PatientImport from "../components/PatientImport.jsx";
import { initials, avatarColor, formatDate, relativeDay } from "../lib/format.js";
import { normalizeFicha, calcEdad } from "../lib/ficha.js";

export default function Clients() {
  const { clients, appointments, addClient, updateClient, removeClient } =
    useStore();
  const { currentUser } = useAuth();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => normalizeFicha());
  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const myClients = useMemo(
    () => clients.filter((c) => c.doctorId === currentUser?.id),
    [clients, currentUser]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myClients;
    return myClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [myClients, query]);

  function nextAppointment(clientId) {
    const now = Date.now();
    return appointments
      .filter(
        (a) =>
          a.clientId === clientId &&
          a.status === "scheduled" &&
          new Date(a.start).getTime() >= now
      )
      .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  }

  function openAdd() {
    setEditing(null);
    setForm(normalizeFicha());
    setEditorOpen(true);
  }

  function openEdit(client) {
    setViewing(null);
    setEditing(client.id);
    setForm(normalizeFicha(client));
    setEditorOpen(true);
  }

  function save(e) {
    e.preventDefault();
    if (editing) updateClient(editing, form);
    else addClient({ ...form, doctorId: currentUser.id });
    setEditorOpen(false);
  }

  // The freshest copy of the patient currently being viewed.
  const viewingClient = viewing
    ? myClients.find((c) => c.id === viewing.id) ?? viewing
    : null;

  return (
    <div className="space-y-5">
      <PatientImport />
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-10"
            placeholder={t("clients.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> {t("clients.newFicha")}
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon={Users}
          title={t("clients.noClients")}
          hint={t("clients.noClientsHint")}
          action={
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={18} /> {t("clients.newFicha")}
            </button>
          }
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const next = nextAppointment(c.id);
            const edad = calcEdad(c.dob);
            return (
              <div
                key={c.id}
                onClick={() => setViewing(c)}
                className="card flex cursor-pointer flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${avatarColor(
                      c.name
                    )}`}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        edad != null ? t("clients.years", { n: edad }) : null,
                        c.sexo || null,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        t("clients.patientSince", {
                          date: formatDate(c.createdAt),
                        })}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      aria-label={t("clients.editFicha")}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setToDelete(c)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-600">
                    <Mail size={15} className="text-slate-400" />
                    <span className="truncate">{c.email || "—"}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone size={15} className="text-slate-400" />
                    {c.phone || "—"}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                  <span className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-brand-500" />
                    {next ? (
                      <span className="text-slate-600">
                        {t("clients.nextVisit")}{" "}
                        <span className="font-medium text-slate-800">
                          {relativeDay(next.start)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">{t("clients.noUpcomingVisit")}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
                    <FileText size={14} /> {t("clients.ficha")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ficha viewer */}
      <Modal
        open={!!viewingClient}
        onClose={() => setViewing(null)}
        title={t("clients.fichaClinica")}
        size="xl"
        footer={
          <>
            <button className="btn-outline" onClick={() => setViewing(null)}>
              {t("common.close")}
            </button>
            <button className="btn-outline" onClick={() => window.print()}>
              <Printer size={16} /> {t("clients.print")}
            </button>
            <button
              className="btn-primary"
              onClick={() => openEdit(viewingClient)}
            >
              <Pencil size={16} /> {t("clients.editFicha")}
            </button>
          </>
        }
      >
        {viewingClient && (
          <div className="space-y-5">
            <FichaView client={viewingClient} doctorName={currentUser?.name} />
            <TreatmentLog
              patient={viewingClient}
              onOdontogramPatch={(tooth, status) => {
                const odontograma = {
                  ...(viewingClient.odontograma || {}),
                  [tooth]: status,
                };
                updateClient(viewingClient.id, { odontograma });
              }}
            />
          </div>
        )}
      </Modal>

      {/* Ficha editor */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t("clients.editFichaTitle") : t("clients.newFichaTitle")}
        size="xl"
        footer={
          <>
            <button className="btn-outline" onClick={() => setEditorOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn-primary" form="ficha-form" type="submit">
              {editing ? t("clients.saveChanges") : t("clients.createFicha")}
            </button>
          </>
        }
      >
        <FichaEditor
          form={form}
          setForm={setForm}
          formId="ficha-form"
          onSubmit={save}
        />
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => removeClient(toDelete.id)}
        title={t("clients.deletePatient")}
        message={t("clients.deleteMsg", { name: toDelete?.name })}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
