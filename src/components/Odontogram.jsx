import {
  TEETH_UPPER,
  TEETH_LOWER,
  TEETH_UPPER_PRIMARY,
  TEETH_LOWER_PRIMARY,
  ODONTO_STATUSES,
  odontoStatus,
  nextOdontoStatus,
} from "../lib/ficha.js";

function Tooth({ number, statusKey, onClick, readOnly, small }) {
  const status = odontoStatus(statusKey);
  const Tag = readOnly ? "div" : "button";
  const box = small ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
  const col = small ? "w-6" : "w-7";
  return (
    <div className={`flex flex-col items-center gap-1 ${col}`}>
      <Tag
        type={readOnly ? undefined : "button"}
        onClick={readOnly ? undefined : onClick}
        title={`Diente ${number}${status.label ? ` · ${status.label}` : ""}`}
        className={`flex items-center justify-center rounded-md border font-bold transition ${box} ${status.swatch} ${
          readOnly ? "" : "cursor-pointer hover:ring-2 hover:ring-brand-300"
        }`}
      >
        {status.abbr}
      </Tag>
      <span
        className={`font-medium tabular-nums text-slate-400 ${
          small ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {number}
      </span>
    </div>
  );
}

function Arch({ teeth, value, onToggle, readOnly, small }) {
  return (
    <div className={`flex justify-center ${small ? "gap-0.5" : "gap-1"}`}>
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
            small={small}
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
        <div className="mx-auto w-max space-y-1.5 py-1">
          {/* Permanent upper arch */}
          <Arch teeth={TEETH_UPPER} value={value} onToggle={toggle} readOnly={readOnly} />
          {/* Primary (children) upper arch — smaller, sits inside the adult arch */}
          <Arch teeth={TEETH_UPPER_PRIMARY} value={value} onToggle={toggle} readOnly={readOnly} small />
          <div className="mx-auto my-0.5 h-px w-full max-w-md bg-slate-200" />
          {/* Primary (children) lower arch */}
          <Arch teeth={TEETH_LOWER_PRIMARY} value={value} onToggle={toggle} readOnly={readOnly} small />
          {/* Permanent lower arch */}
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
