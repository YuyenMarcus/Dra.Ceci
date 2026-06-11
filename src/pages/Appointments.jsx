import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  CalendarDays,
  Clock,
  Stethoscope,
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
  FileText,
  Link2,
  Search,
  UserPlus,
} from "lucide-react";
import { useStore } from "../store/StoreContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import Modal from "../components/Modal.jsx";
import Confirm from "../components/Confirm.jsx";
import Empty from "../components/Empty.jsx";
import {
  initials,
  avatarColor,
  formatTime,
  relativeDay,
  toLocalInput,
} from "../lib/format.js";
import { VISIT_REASON_KEYS } from "../lib/reasons.js";

const TABS = [
  { id: "upcoming", labelKey: "appt.upcoming" },
  { id: "past", labelKey: "appt.past" },
  { id: "cancelled", labelKey: "appt.cancelled" },
];

const durations = [15, 30, 45, 60, 90];

// Compare phone numbers loosely by their last 8 digits, so an E.164 booking
// (e.g. +50370001234) matches a record saved as "7000-1234".
function phoneTail(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

export default function Appointments() {
  const {
    appointments,
    clients,
    bookAppointment,
    cancelAppointment,
    updateAppointment,
    removeAppointment,
  } = useStore();
  const { currentUser, receptionMode } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const myClients = useMemo(
    () => clients.filter((c) => c.doctorId === currentUser?.id),
    [clients, currentUser]
  );

  const [tab, setTab] = useState("upcoming");
  const [modalOpen, setModalOpen] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [bookError, setBookError] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [form, setForm] = useState(() => ({
    clientId: "",
    reason: "",
    notes: "",
    start: toLocalInput(),
    durationMin: 30,
  }));

  const clientById = (id) => clients.find((c) => c.id === id);

  const groups = useMemo(() => {
    const now = Date.now();
    const sorted = [...appointments]
      .filter((a) => a.doctorId === currentUser?.id)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    return {
      upcoming: sorted.filter(
        (a) => a.status === "scheduled" && new Date(a.start).getTime() >= now
      ),
      past: sorted
        .filter(
          (a) =>
            a.status === "completed" ||
            (a.status === "scheduled" && new Date(a.start).getTime() < now)
        )
        .reverse(),
      cancelled: sorted.filter((a) => a.status === "cancelled").reverse(),
    };
  }, [appointments, currentUser]);

  const list = groups[tab];

  function openSchedule() {
    setForm({
      clientId: myClients[0]?.id ?? "",
      reason: "",
      notes: "",
      start: toLocalInput(),
      durationMin: 30,
    });
    setBookError(null);
    setModalOpen(true);
  }

  function save(e) {
    e.preventDefault();
    const res = bookAppointment({
      ...form,
      doctorId: currentUser.id,
      provider: currentUser.name,
      durationMin: Number(form.durationMin),
      start: new Date(form.start).toISOString(),
    });
    if (!res.ok) {
      setBookError({ key: res.error, vars: res.errorVars });
      return;
    }
    setModalOpen(false);
  }

  function openAssign(appt) {
    setAssignQuery("");
    setAssigning(appt);
  }

  function linkFicha(clientId) {
    if (assigning) updateAppointment(assigning.id, { clientId });
    setAssigning(null);
  }

  function openFicha(clientId) {
    navigate("/app/clients", { state: { openClientId: clientId } });
  }

  function createFichaFromBooking() {
    if (!assigning) return;
    navigate("/app/clients", {
      state: {
        newFicha: {
          name: assigning.patientName || "",
          phone: assigning.patientPhone || "",
          email: assigning.patientEmail || "",
        },
      },
    });
  }

  // Records ranked for the assign modal: phone matches first, then by name,
  // filtered by the search box.
  const assignMatches = useMemo(() => {
    if (!assigning) return [];
    const tail = phoneTail(assigning.patientPhone);
    const q = assignQuery.trim().toLowerCase();
    return myClients
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
      )
      .map((c) => ({ c, match: tail && phoneTail(c.phone) === tail }))
      .sort((a, b) => {
        if (a.match !== b.match) return a.match ? -1 : 1;
        return a.c.name.localeCompare(b.c.name);
      });
  }, [assigning, assignQuery, myClients]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 sm:inline-flex sm:w-auto">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition sm:flex-none sm:px-4 ${
                tab === tabItem.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t(tabItem.labelKey)}
              <span className="ml-1.5 text-xs opacity-70">
                {groups[tabItem.id].length}
              </span>
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={openSchedule}>
          <Plus size={18} /> {t("appt.schedule")}
        </button>
      </div>

      {list.length === 0 ? (
        <Empty
          icon={CalendarDays}
          title={
            tab === "upcoming"
              ? t("appt.noUpcoming")
              : tab === "past"
              ? t("appt.noPast")
              : t("appt.noCancelled")
          }
          hint={
            tab === "upcoming"
              ? t("appt.emptyUpcomingHint")
              : t("appt.emptyOtherHint")
          }
          action={
            tab === "upcoming" ? (
              <button className="btn-primary" onClick={openSchedule}>
                <Plus size={18} /> {t("appt.schedule")}
              </button>
            ) : null
          }
        />
      ) : (
        <div className="stagger space-y-3">
          {list.map((a) => {
            const client = clientById(a.clientId);
            const name = client?.name ?? a.patientName ?? t("appt.unknownClient");
            const phone = client?.phone ?? a.patientPhone ?? "";
            const cancelled = a.status === "cancelled";
            const completed = a.status === "completed";
            return (
              <div
                key={a.id}
                className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${
                  cancelled ? "opacity-70" : ""
                }`}
              >
                {/* Date block */}
                <div className="flex w-full items-center gap-3 sm:w-44 sm:flex-col sm:items-start sm:border-r sm:border-slate-100 sm:pr-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <CalendarDays size={16} className="text-brand-500" />
                    {relativeDay(a.start)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} />
                    {formatTime(a.start)} · {a.durationMin}m
                  </div>
                </div>

                {/* Client + reason */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                      name
                    )}`}
                  >
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {name}
                      {a.source === "public" && (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          {t("common.online")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {a.reason}
                      {phone ? ` · ${phone}` : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <Stethoscope size={12} />
                      {a.provider}
                    </p>
                    {a.notes && (
                      <p className="mt-1 truncate text-xs italic text-slate-500">
                        “{a.notes}”
                      </p>
                    )}
                    {/* Ficha (patient record) tag — hidden in reception mode */}
                    {!receptionMode && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {client ? (
                        <>
                          <button
                            onClick={() => openFicha(client.id)}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                          >
                            <FileText size={12} className="shrink-0" />
                            <span className="truncate">
                              {t("appt.fichaTag")}: {client.name}
                            </span>
                          </button>
                          <button
                            onClick={() => openAssign(a)}
                            className="text-xs font-medium text-slate-400 hover:text-brand-600"
                          >
                            {t("appt.changeFicha")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openAssign(a)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700"
                        >
                          <Link2 size={12} /> {t("appt.assignFicha")}
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {cancelled && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      {t("appt.cancelledTag")}
                    </span>
                  )}
                  {completed && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={12} /> {t("appt.completed")}
                    </span>
                  )}

                  {tab === "upcoming" && (
                    <div className="flex gap-2">
                      <button
                        className="btn-outline px-3 py-2 text-xs"
                        onClick={() =>
                          updateAppointment(a.id, { status: "completed" })
                        }
                      >
                        <CheckCircle2 size={14} /> {t("appt.complete")}
                      </button>
                      <button
                        className="btn-danger px-3 py-2 text-xs"
                        onClick={() => setToCancel(a)}
                      >
                        <X size={14} /> {t("appt.cancel")}
                      </button>
                    </div>
                  )}

                  {cancelled && (
                    <div className="flex gap-1">
                      <button
                        className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title={t("appt.restore")}
                        onClick={() =>
                          updateAppointment(a.id, { status: "scheduled" })
                        }
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title={t("appt.deletePermanently")}
                        onClick={() => removeAppointment(a.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("appt.scheduleTitle")}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn-primary" form="apt-form" type="submit">
              {t("appt.schedule")}
            </button>
          </>
        }
      >
        {myClients.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("appt.addClientFirst")}
          </p>
        ) : (
          <form id="apt-form" onSubmit={save} className="space-y-4">
            <div>
              <label className="label">{t("appt.client")}</label>
              <select
                className="input"
                required
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                {myClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("appt.reason")}</label>
              <select
                className="input"
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              >
                <option value="" disabled>
                  {t("common.select")}
                </option>
                {VISIT_REASON_KEYS.map((key) => (
                  <option key={key} value={t(key)}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("appt.notes")}</label>
              <textarea
                className="input min-h-[72px] resize-y"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("appt.notesPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t("appt.provider")}</label>
                <input className="input bg-slate-50" value={currentUser.name} readOnly />
              </div>
              <div>
                <label className="label">{t("appt.duration")}</label>
                <select
                  className="input"
                  value={form.durationMin}
                  onChange={(e) =>
                    setForm({ ...form, durationMin: e.target.value })
                  }
                >
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {t("appt.minutes", { n: d })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t("appt.dateTime")}</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </div>
            {bookError && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                {t(bookError.key, bookError.vars)}
              </p>
            )}
          </form>
        )}
      </Modal>

      {/* Assign / link ficha modal */}
      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={t("appt.assignTitle")}
        footer={
          <>
            <button className="btn-outline" onClick={() => setAssigning(null)}>
              {t("common.cancel")}
            </button>
            {assigning?.clientId && (
              <button
                className="btn-ghost text-rose-600 hover:bg-rose-50"
                onClick={() => linkFicha(null)}
              >
                <X size={16} /> {t("appt.unlinkFicha")}
              </button>
            )}
            <button className="btn-primary" onClick={createFichaFromBooking}>
              <UserPlus size={16} /> {t("appt.createFichaFromBooking")}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-500">{t("appt.assignHint")}</p>
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-10"
            placeholder={t("appt.searchFichas")}
            value={assignQuery}
            onChange={(e) => setAssignQuery(e.target.value)}
          />
        </div>
        {myClients.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
            {t("appt.noFichasYet")}
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {assignMatches.map(({ c, match }) => {
              const selected = assigning?.clientId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => linkFicha(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                      c.name
                    )}`}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {c.phone || "—"}
                    </p>
                  </div>
                  {match && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {t("appt.phoneMatch")}
                    </span>
                  )}
                  {selected && <CheckCircle2 size={16} className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <Confirm
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={() => cancelAppointment(toCancel.id)}
        title={t("appt.cancelTitle")}
        message={t("appt.cancelMsg", {
          name:
            clientById(toCancel?.clientId)?.name ??
            toCancel?.patientName ??
            t("appt.thisClient"),
        })}
        confirmLabel={t("manage.cancelAppointment")}
      />
    </div>
  );
}
