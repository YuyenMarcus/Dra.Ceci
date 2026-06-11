/**
 * LiquidButton — a teal "glass" button.
 *
 * Adapted from the shadcn/Tailwind-v4 snippet to this project's stack (plain
 * JSX, no cva/radix, an `as` prop so it can render as a react-router <Link>).
 *
 * Performance note: the original relied on an SVG `feTurbulence` +
 * `feDisplacementMap` backdrop-filter. That recomputes every frame (brutal
 * during the hero's entrance animations + scroll) and tanked the frame rate,
 * so the glass here is faked cheaply with a translucent teal tint, a light
 * backdrop blur, and inset highlight shadows — all GPU-friendly and static.
 */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses = {
  sm: "h-8 gap-1.5 px-4 text-xs",
  default: "h-9 px-4 py-2",
  lg: "h-11 px-6 text-base",
  xl: "h-12 px-8 text-base",
  xxl: "h-14 px-10 text-base",
  icon: "size-9",
};

export function LiquidButton({
  className,
  size = "lg",
  as: Comp = "button",
  children,
  ...props
}) {
  return (
    <Comp
      data-slot="liquid-button"
      className={cn(
        "group relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold outline-none transition-transform duration-200 hover:scale-[1.03] active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size] || sizeClasses.default,
        className
      )}
      {...props}
    >
      {/* See-through glass with a teal hue: low-opacity tint + a real frost
          (backdrop-blur), so the background shows through instead of a solid
          fill. backdrop-blur is cheap on a small element — no SVG filter. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-brand-400/25 to-brand-600/35 backdrop-blur-md"
      />
      {/* Thin glass edge: one top sheen + a soft teal glow. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-full ring-1 ring-inset ring-white/30
          shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_16px_rgba(13,148,136,0.25)]"
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </Comp>
  );
}

export default LiquidButton;
