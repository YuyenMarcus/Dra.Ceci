import { Link } from "react-router-dom";
import BrandMark from "../BrandMark.jsx";

/**
 * Footer2 — multi-column site footer, adapted from the shadcnblocks
 * `footer2` block to this project's stack:
 *  - plain JSX (no TS), react-router <Link> for in-app routes
 *  - the shadcn token classes (text-muted-foreground, hover:text-primary,
 *    container, border) are swapped for this project's slate/brand palette
 *  - the placeholder <img> logo is replaced with the shared <BrandMark>
 *
 * Keeps the original props contract (logo / tagline / menuItems /
 * copyright / bottomLinks) so it stays data-driven and reusable.
 * A link whose `url` starts with "/" renders as a router <Link>;
 * anything else (anchors, mailto, external) renders as a plain <a>.
 */
function FooterLink({ url, className, children }) {
  if (url?.startsWith("/")) {
    return (
      <Link to={url} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={url} className={className}>
      {children}
    </a>
  );
}

export function Footer2({
  logo,
  tagline,
  menuItems = [],
  copyright,
  bottomLinks = [],
}) {
  return (
    <footer className="border-t border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          <div className="col-span-2 mb-8 lg:mb-0">
            <FooterLink
              url={logo?.url || "/"}
              className="flex items-center gap-2"
            >
              <BrandMark size={40} />
              {logo?.title && (
                <span className="text-xl font-semibold text-slate-900">
                  {logo.title}
                </span>
              )}
            </FooterLink>
            {tagline && (
              <p className="mt-4 max-w-xs text-sm text-slate-500">{tagline}</p>
            )}
          </div>

          {menuItems.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h3 className="mb-4 font-bold text-slate-900">{section.title}</h3>
              <ul className="space-y-3 text-sm text-slate-500">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <FooterLink
                      url={link.url}
                      className="font-medium transition-colors hover:text-brand-700"
                    >
                      {link.text}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-slate-200 pt-8 text-sm font-medium text-slate-400 md:flex-row md:items-center">
          <p>{copyright}</p>
          <ul className="flex gap-4">
            {bottomLinks.map((link, linkIdx) => (
              <li key={linkIdx}>
                <FooterLink
                  url={link.url}
                  className="underline transition-colors hover:text-brand-700"
                >
                  {link.text}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
