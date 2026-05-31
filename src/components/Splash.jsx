import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";

/**
 * Branded intro sequence shown once per browser session.
 *  1. Logo pops in with expanding pulse rings
 *  2. Wordmark + tagline rise up
 *  3. A loading bar fills, then the whole overlay fades away
 */
export default function Splash({ onDone }) {
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900"
      style={
        leaving
          ? { animation: "mt-splash-out .5s ease forwards" }
          : undefined
      }
    >
      {/* Logo with pulse rings */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          className="absolute inset-0 rounded-3xl bg-white/20"
          style={{ animation: "mt-ring 1.8s ease-out infinite" }}
        />
        <span
          className="absolute inset-0 rounded-3xl bg-white/20"
          style={{ animation: "mt-ring 1.8s ease-out infinite", animationDelay: ".6s" }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-brand-700 shadow-2xl shadow-black/20"
          style={{ animation: "mt-logo-pop .7s cubic-bezier(.21,1.02,.73,1) both" }}
        >
          <Stethoscope size={44} strokeWidth={2.2} />
        </div>
      </div>

      {/* Wordmark */}
      <h1
        className="mt-7 text-3xl font-bold tracking-tight text-white"
        style={{ animation: "mt-fade-up .6s ease both", animationDelay: ".35s" }}
      >
        MedTrack
      </h1>
      <p
        className="mt-1.5 text-sm font-medium text-brand-200"
        style={{ animation: "mt-fade-up .6s ease both", animationDelay: ".5s" }}
      >
        Clinic inventory &amp; scheduling
      </p>

      {/* Loading bar */}
      <div
        className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/15"
        style={{ animation: "mt-fade-in .4s ease both", animationDelay: ".6s" }}
      >
        <div
          className="h-full w-full origin-left rounded-full bg-white/90"
          style={{ animation: "mt-bar 1.25s cubic-bezier(.65,0,.35,1) both", animationDelay: ".55s" }}
        />
      </div>
    </div>
  );
}
