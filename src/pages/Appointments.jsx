import { useMemo, useState } from "react";
import {
  Plus,
  CalendarDays,
  Clock,
  Stethoscope,
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
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

export default function Appointments() {
  const {
    appointments,
    clients,
    bookAppointment,
    cancelAppointment,
    updateAppointment,
    removeAppointment,
  } = useStore();
  const { currentUser } = useAuth();
  const { t } = useLang();

  const myClients = useMemo(
    () => clients.filter((c) => c.doctorId === currentUser?.id),
    [clients, currentUser]
  );

  const [tab, setTab] = useState("upcoming");
  const [modalOpen, setModalOpen] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [bookError, setBookError] = useState(null);
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
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
            <div className="grid grid-cols-2 gap-4">
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
