import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Brush,
  Sun,
  Smile,
  Activity,
  ClipboardCheck,
  Stethoscope,
  Syringe,
  Crown,
  Baby,
  ShieldCheck,
  Heart,
  Star,
  Scissors,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Custom dental line icons. Drawn lucide-style: 24×24 viewBox, currentColor
// stroke, round caps — so they sit naturally alongside the lucide icons below.
// ---------------------------------------------------------------------------
function dentalSvg(size, rest) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };
}

const TOOTH_PATH =
  "M12 4.5c-1.3-1-2.4-1.4-3.8-1.4C5.9 3.1 4.5 4.8 4.5 7.2c0 1.4.3 2.5.7 4 .4 1.6.7 3.9 1.1 5.6.2.9.4 1.7.8 2.4.3.5 1 .5 1.3 0 .4-.7.6-1.8.8-3 .2-1.2.4-2.2 1.3-2.2s1.1 1 1.3 2.2c.2 1.2.4 2.3.8 3 .3.5 1 .5 1.3 0 .4-.7.6-1.5.8-2.4.4-1.7.7-4 1.1-5.6.4-1.5.7-2.6.7-4 0-2.4-1.4-4.1-3.7-4.1-1.4 0-2.5.4-3.8 1.4Z";

export function Tooth({ size = 24, ...rest }) {
  return (
    <svg {...dentalSvg(size, rest)}>
      <path d={TOOTH_PATH} />
    </svg>
  );
}

export function ToothClean({ size = 24, ...rest }) {
  return (
    <svg {...dentalSvg(size, rest)}>
      <path d={TOOTH_PATH} />
      <path
        d="M18.2 2.4c.27 1.12.49 1.34 1.6 1.6-1.11.27-1.33.49-1.6 1.6-.27-1.11-.49-1.33-1.6-1.6 1.11-.26 1.33-.48 1.6-1.6Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function ToothBraces({ size = 24, ...rest }) {
  return (
    <svg {...dentalSvg(size, rest)}>
      <path d={TOOTH_PATH} />
      <path d="M6.6 12.4h10.8" />
      <path d="M9 11.2v2.4" />
      <path d="M12 11.2v2.4" />
      <path d="M15 11.2v2.4" />
    </svg>
  );
}

export function ToothCracked({ size = 24, ...rest }) {
  return (
    <svg {...dentalSvg(size, rest)}>
      <path d={TOOTH_PATH} />
      <path d="M12 6.5l-1.5 3 2.1.9-1.4 3.2" />
    </svg>
  );
}

export function ToothImplant({ size = 24, ...rest }) {
  return (
    <svg {...dentalSvg(size, rest)}>
      <path d="M7.5 8.2c0-2.6 2-4.7 4.5-4.7s4.5 2.1 4.5 4.7c0 1.1-.9 1.6-1 2.8H8.5c-.1-1.2-1-1.7-1-2.8Z" />
      <path d="M9.2 13h5.6" />
      <path d="M9.7 15.4h4.6" />
      <path d="M10.3 17.8h3.4" />
      <path d="M12 20.2v.6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Registry. `key` is what we persist on each service; order here is the order
// shown in the picker. Dental icons first, then general clinical/aesthetic.
// ---------------------------------------------------------------------------
export const SERVICE_ICONS = [
  { key: "tooth", Icon: Tooth },
  { key: "toothClean", Icon: ToothClean },
  { key: "toothBraces", Icon: ToothBraces },
  { key: "toothImplant", Icon: ToothImplant },
  { key: "toothCracked", Icon: ToothCracked },
  { key: "crown", Icon: Crown },
  { key: "sparkles", Icon: Sparkles },
  { key: "sun", Icon: Sun },
  { key: "smile", Icon: Smile },
  { key: "brush", Icon: Brush },
  { key: "clipboardCheck", Icon: ClipboardCheck },
  { key: "stethoscope", Icon: Stethoscope },
  { key: "syringe", Icon: Syringe },
  { key: "activity", Icon: Activity },
  { key: "shieldCheck", Icon: ShieldCheck },
  { key: "baby", Icon: Baby },
  { key: "heart", Icon: Heart },
  { key: "scissors", Icon: Scissors },
  { key: "star", Icon: Star },
];

const ICON_MAP = Object.fromEntries(SERVICE_ICONS.map(({ key, Icon }) => [key, Icon]));

export const DEFAULT_SERVICE_ICON = "tooth";

// Resolve a stored key to a component, falling back to the default tooth.
export function getServiceIcon(key) {
  return ICON_MAP[key] || ICON_MAP[DEFAULT_SERVICE_ICON];
}

// ---------------------------------------------------------------------------
// Picker: a swatch button that opens a popover grid of icons.
// ---------------------------------------------------------------------------
export function ServiceIconPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const Selected = getServiceIcon(value);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition hover:border-brand-300 dark:border-slate-600 dark:from-slate-700 dark:to-slate-700 dark:text-brand-300"
      >
        <Selected size={22} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-5 gap-1">
            {SERVICE_ICONS.map(({ key, Icon }) => {
              const active = key === (value || DEFAULT_SERVICE_ICON);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
