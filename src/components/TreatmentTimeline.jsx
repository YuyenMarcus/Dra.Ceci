import { Calendar, Stethoscope, Smile, MessageSquare } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { formatDate } from "../lib/format.js";
import { toothLabel } from "../lib/toothLabels.js";

function Entry({ item, showClinic }) {
  const { t, lang } = useLang();
  const tooth = item.tooth ? toothLabel(item.tooth, lang) : null;

  return (
    <div className="relative border-l-2 border-brand-200 pl-5 pb-6 last:pb-0">
      <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{item.procedure}</p>
            {showClinic && item.clinicName && (
              <p className="mt-0.5 text-xs font-medium text-portal-700">
                {item.clinicName}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Calendar size={12} />
            {formatDate(item.date)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          {item.provider && (
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope size={14} className="text-slate-400" />
              {item.provider}
            </span>
          )}
          {tooth && (
            <span className="inline-flex items-center gap-1.5">
              <Smile size={14} className="text-slate-400" />
              {tooth}
            </span>
          )}
        </div>

        {item.patientNote && (
          <p className="mt-3 flex gap-2 text-sm text-slate-600">
            <MessageSquare size={15} className="mt-0.5 shrink-0 text-slate-400" />
            {item.patientNote}
          </p>
        )}

        {item.followUp && (
          <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
            <span className="font-medium">{t("tx.followUp")}: </span>
            {item.followUp}
          </p>
        )}

        {item.status === "planned" && (
          <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            {t("tx.planned")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TreatmentTimeline({ items = [], showClinic = false, emptyHint }) {
  const { t } = useLang();

  if (!items.length) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
        {emptyHint || t("tx.emptyPatient")}
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => (
        <Entry key={item.id} item={item} showClinic={showClinic} />
      ))}
    </div>
  );
}
