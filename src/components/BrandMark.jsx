/**
 * Clinika brand mark — the infinity logo inside a rounded tile.
 * The transparent logo (/logo.png) reads well on both light and dark
 * surfaces thanks to the white tile, so this is used everywhere the
 * app shows its logo (sidebar, splash, headers, auth screens).
 */
export default function BrandMark({
  size = 36,
  rounded = "rounded-xl",
  className = "",
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="Clinika"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
