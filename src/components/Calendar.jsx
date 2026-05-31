import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isWorkingDay, dateKey, monthMatrix } from "../lib/availability.js";
import { useLang } from "../i18n/LanguageContext.jsx";

const LOCALES = { es: "es-ES", en: "en-US" };

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Month-grid date picker. Only working days that are today or later are
// selectable; the user can page forward through as many months as needed.
export default function Calendar({ doctor, value, onSelect }) {
  const { lang } = useLang();
  const locale = LOCALES[lang] ?? LOCALES.es;

  const today = startOfDay(new Date());
  const selected = value ? new Date(`${value}T00:00:00`) : null;

  const [view, setView] = useState(() => {
    const base = selected ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const weeks = useMemo(
    () => monthMatrix(view.year, view.month),
    [view.year, view.month]
  );

  // Localized weekday initials, Sunday-first.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 8, 1 + i))
    );
  }, [locale]);

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month, 1));

  // Can't navigate to a month entirely in the past.
  const atCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();

  function shift(delta) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atCurrentMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="←"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold capitalize text-slate-800">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label="→"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((w, i) => (
          <div
            key={i}
            className="py-1 text-center text-[11px] font-semibold uppercase text-slate-400"
          >
            {w}
          </div>
        ))}

        {weeks.flat().map((date) => {
          const inMonth = date.getMonth() === view.month;
          const key = dateKey(date);
          const isPast = startOfDay(date) < today;
          const working = isWorkingDay(doctor, date);
          const selectable = inMonth && working && !isPast;
          const isSelected = value === key;
          const isToday = key === dateKey(today);

          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelect(key)}
              className={[
                "flex h-9 items-center justify-center rounded-lg text-sm transition",
                !inMonth ? "text-slate-300" : "",
                isSelected
                  ? "bg-brand-600 font-bold text-white"
                  : selectable
                  ? "font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  : "cursor-not-allowed text-slate-300",
                !isSelected && isToday ? "ring-1 ring-brand-300" : "",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
