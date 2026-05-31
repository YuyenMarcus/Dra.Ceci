import { useCallback, useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, Sparkles, MousePointerClick } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";

const CARD_W = 330;
const EST_H = 220;
const PAD = 8;

// Lightweight guided-tour / coachmark overlay used for the demo walkthroughs.
// `steps` is an array of { selector?, title, body, interactive? }. A step without
// a selector renders a centered card. When `interactive` is set, the highlighted
// element stays clickable so the user can actually use that part of the UI.
export default function Tour({ steps, open, onClose }) {
  const { t } = useLang();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  const step = steps[i];

  // Measure the current target without scrolling (used for polling/resize).
  const measure = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Scroll the target into view when the step changes, then measure.
  useEffect(() => {
    if (!open) return;
    if (step?.selector) {
      const el = document.querySelector(step.selector);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [open, i, step, measure]);

  // Keep the highlight aligned as the page/layout changes (e.g. the user picks
  // a day and the slot grid resizes during an interactive step).
  useEffect(() => {
    if (!open) return;
    const id = setInterval(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  if (!open || !step) return null;

  const last = i === steps.length - 1;
  const interactive = !!step.interactive;

  // Tooltip position.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardStyle;
  if (rect) {
    const left = Math.min(Math.max(rect.left, 16), vw - CARD_W - 16);
    const below = rect.top + rect.height + 14 + EST_H < vh;
    cardStyle = below
      ? { top: rect.top + rect.height + 14, left }
      : { bottom: vh - rect.top + 14, left };
  } else {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const blockStyle = "fixed z-[1000] bg-slate-900/60";

  return (
    <>
      {/* Click blocker(s). For interactive steps we leave a hole over the target
          so it stays usable; everything else is still blocked. */}
      {!rect ? (
        // No target: dim the whole screen unless the step is interactive.
        !interactive && <div className="fixed inset-0 z-[1000] bg-slate-900/60" />
      ) : interactive ? (
        <>
          <div className={blockStyle} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) }} />
          <div className={blockStyle} style={{ top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0 }} />
          <div className={blockStyle} style={{ top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 }} />
          <div className={blockStyle} style={{ top: rect.top - PAD, left: rect.left + rect.width + PAD, right: 0, height: rect.height + PAD * 2 }} />
        </>
      ) : (
        // Non-interactive with a target: transparent full-screen blocker, the
        // spotlight box-shadow below provides the dimming.
        <div className="fixed inset-0 z-[1000]" />
      )}

      {/* Spotlight ring around the target. */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[1001] rounded-xl ring-2 ring-brand-400 transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            // Only the non-interactive variant dims via box-shadow; interactive
            // steps already get their dimming from the four panels above.
            boxShadow: interactive ? "none" : "0 0 0 9999px rgba(15,23,42,0.6)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="animate-scale-in fixed z-[1002] w-[330px] max-w-[calc(100vw-32px)] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-900/5"
        style={cardStyle}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {interactive ? <MousePointerClick size={12} /> : <Sparkles size={12} />}
            {interactive ? t("tour.tryIt") : t("tour.demoTour")}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-brand-600" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI((n) => n - 1)}
                className="btn-ghost px-2.5 py-1.5 text-xs"
              >
                <ArrowLeft size={14} /> {t("common.back")}
              </button>
            )}
            {last ? (
              <button
                onClick={onClose}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                <Check size={14} /> {t("tour.gotIt")}
              </button>
            ) : (
              <button
                onClick={() => setI((n) => n + 1)}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                {t("common.next")} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {!last && (
          <button
            onClick={onClose}
            className="mt-2 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            {t("tour.skip")}
          </button>
        )}
      </div>
    </>
  );
}
