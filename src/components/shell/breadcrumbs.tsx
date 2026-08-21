import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

/**
 * Server-rendered breadcrumb strip. Only used deeper than main-nav level
 * (subject detail, submission detail); explicit crumb arrays, no path magic.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      data-testid="breadcrumbs"
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap"
    >
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1 min-w-0">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="font-medium hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "font-semibold text-foreground truncate" : "truncate"}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
