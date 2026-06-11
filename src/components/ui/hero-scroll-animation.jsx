import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Animated features panel — adapted from the `hero-scroll-animation` snippet.
 *
 * The original was a full-height, sticky two-panel scroll-jack (2x viewport).
 * That ate too much vertical space and competed with the hero, so this is a
 * compact, contained card that simply reveals itself (scale + fade + rise)
 * once as it scrolls into view via `whileInView`. Same teal theme, rounded
 * corners and subtle grid, just a fraction of the page height — and no
 * scroll-jacking, which also keeps it smooth.
 */
const GRID =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0d948814_1px,transparent_1px),linear-gradient(to_bottom,#0d948814_1px,transparent_1px)] bg-[size:54px_54px]";

export default function HeroScroll({ title, subtitle, features = [], ctaTo, ctaLabel }) {
  return (
    <section className="px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 40 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-t from-brand-950 to-brand-800 text-white"
      >
        <div className={GRID} />
        <div className="relative z-10 px-6 py-16 sm:px-10 sm:py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold leading-[110%] tracking-tight sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto mt-3 max-w-md text-brand-100/70">{subtitle}</p>
            )}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title: cardTitle, desc }) => (
              <div
                key={cardTitle}
                className="rounded-2xl border border-white/20 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {Icon && <Icon size={22} />}
                </div>
                <h3 className="font-semibold text-slate-900">{cardTitle}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {ctaTo && (
            <div className="mt-10 text-center">
              <Link
                to={ctaTo}
                className="btn bg-white px-7 py-3.5 text-base text-brand-800 hover:bg-brand-50"
              >
                {ctaLabel}
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
