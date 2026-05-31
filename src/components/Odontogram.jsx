import {
  TEETH_UPPER,
  TEETH_LOWER,
  ODONTO_STATUSES,
  odontoStatus,
  nextOdontoStatus,
} from "../lib/ficha.js";

function Tooth({ number, statusKey, onClick, readOnly }) {
  const status = odontoStatus(statusKey);
  const Tag = readOnly ? "div" : "button";
  return (
    <div className="flex w-7 flex-col items-center gap-1">
      <Tag
        type={readOnly ? undefined : "button"}
        onClick={readOnly ? undefined : onClick}
        title={`Diente ${number}${status.label ? ` · ${status.label}` : ""}`}
        className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold transition ${status.swatch} ${
          readOnly ? "" : "cursor-pointer hover:ring-2 hover:ring-brand-300"
        }`}
      >
        {status.abbr}
      </Tag>
      <span className="text-[10px] font-medium tabular-nums text-slate-400">
        {number}
      </span>
    </div>
  );
}

function Arch({ teeth, value, onToggle, readOnly }) {
  return (
    <div className="flex justify-center gap-1">
      {teeth.map((n, i) => (
        <div key={n} className="flex">
          {/* Midline divider between the two quadrants. */}
          {i === teeth.length / 2 && (
            <span className="mx-1 w-px self-stretch bg-slate-200" />
          )}
          <Tooth
            number={n}
            statusKey={value[n] || "none"}
            readOnly={readOnly}
            onClick={() => onToggle?.(n)}
          />
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {ODONTO_STATUSES.filter((s) => s.key !== "none").map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold ${s.swatch}`}
          >
            {s.abbr}
          </span>
          {s.label}
        </span>
      ))}
    </div>
  );
}

// Numbered dental chart (FDI notation). When `readOnly` is false, clicking a
// tooth cycles its status; `onChange` receives the updated tooth→status map.
export default function Odontogram({ value = {}, onChange, readOnly = false }) {
  function toggle(toothNumber) {
    if (readOnly) return;
    const current = value[toothNumber] || "none";
    const next = nextOdontoStatus(current);
    const updated = { ...value };
    if (next === "none") delete updated[toothNumber];
    else updated[toothNumber] = next;
    onChange?.(updated);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="mx-auto w-max space-y-2 py-1">
          <Arch teeth={TEETH_UPPER} value={value} onToggle={toggle} readOnly={readOnly} />
          <div className="mx-auto h-px w-full max-w-md bg-slate-100" />
          <Arch teeth={TEETH_LOWER} value={value} onToggle={toggle} readOnly={readOnly} />
        </div>
      </div>
      {!readOnly && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Toca un diente para cambiar su estado.
        </p>
      )}
      <Legend />
    </div>
  );
}
