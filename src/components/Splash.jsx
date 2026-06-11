import { useEffect, useState } from "react";
import { useLang } from "../i18n/LanguageContext.jsx";

/**
 * Branded intro sequence shown once per browser session.
 *  1. Logo pops in with expanding pulse rings, then floats gently while a
 *     light streak sweeps across the tile
 *  2. Wordmark (shimmering gradient) + tagline rise up
 *  3. A glowing loading bar fills; the content lifts away and the overlay
 *     fades out
 */
export default function Splash({ onDone }) {
  const { t } = useLang();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 1900);
    const doneTimer = setTimeout(() => onDone?.(), 2450);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900"
      style={leaving ? { animation: "mt-splash-out .5s ease forwards" } : undefined}
    >
      {/* Ambient drifting glows behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl"
        style={{ animation: "mt-float 7s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-28 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        style={{ animation: "mt-float 9s ease-in-out infinite", animationDelay: "1.2s" }}
      />

      {/* Content lifts away as a unit when leaving */}
      <div
        className="relative flex flex-col items-center"
        style={leaving ? { animation: "mt-splash-lift .5s ease forwards" } : undefined}
      >
        {/* Logo with pulse rings; floats gently once the pop has landed */}
        <div
          className="relative flex h-24 w-24 items-center justify-center"
          style={{ animation: "mt-float 5.5s ease-in-out 1.1s infinite" }}
        >
          <span
            className="absolute inset-0 rounded-3xl bg-white/20"
            style={{ animation: "mt-ring 1.8s ease-out infinite" }}
          />
          <span
            className="absolute inset-0 rounded-3xl bg-white/20"
            style={{ animation: "mt-ring 1.8s ease-out infinite", animationDelay: ".6s" }}
          />
          <div
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/20"
            style={{ animation: "mt-logo-pop .7s cubic-bezier(.21,1.02,.73,1) both" }}
          >
            <img
              src="/logo.png"
              alt="Clinika"
              className="h-20 w-20 object-contain"
              draggable={false}
            />
            {/* Light streak sweeping across the tile */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1/3"
              style={{
                background:
                  "linear-gradient(105deg, transparent, rgba(13,148,136,0.18), transparent)",
                animation: "mt-shine 2.6s ease-in-out 1s infinite",
              }}
            />
          </div>
        </div>

        {/* Wordmark with a slow shimmer across a light gradient */}
        <h1
          className="mt-7 bg-gradient-to-r from-white via-brand-200 to-white bg-clip-text text-3xl font-bold tracking-tight text-transparent"
          style={{
            backgroundSize: "200% 100%",
            animation:
              "mt-fade-up .6s ease .35s both, mt-gradient-pan 3s linear 1.2s infinite",
          }}
        >
          Clinika
        </h1>
        <p
          className="mt-1.5 text-sm font-medium text-brand-200"
          style={{ animation: "mt-fade-up .6s ease .5s both" }}
        >
          {t("splash.tagline")}
        </p>

        {/* Loading bar with a soft glow */}
        <div
          className="mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-white/15"
          style={{ animation: "mt-fade-in .4s ease .6s both" }}
        >
          <div
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-300 via-white to-brand-100"
            style={{
              boxShadow: "0 0 12px rgba(255,255,255,0.45)",
              animation: "mt-bar 1.25s cubic-bezier(.65,0,.35,1) .55s both",
            }}
          />
        </div>
      </div>
    </div>
  );
}
