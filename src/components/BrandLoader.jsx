import BrandMark from "./BrandMark.jsx";

/**
 * Branded full-screen loader — the logo tile pops in with soft expanding
 * pulse rings (same motion language as the intro splash), so loading states
 * feel like a continuation of the brand instead of a generic spinner.
 */
export default function BrandLoader({ className = "" }) {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 ${className}`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-brand-400/25"
          style={{ animation: "mt-ring 1.6s ease-out infinite" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-brand-400/25"
          style={{ animation: "mt-ring 1.6s ease-out infinite", animationDelay: ".55s" }}
        />
        <div style={{ animation: "mt-logo-pop .5s cubic-bezier(.21,1.02,.73,1) both" }}>
          <BrandMark size={56} rounded="rounded-2xl" className="relative shadow-lg" />
        </div>
      </div>
    </div>
  );
}
