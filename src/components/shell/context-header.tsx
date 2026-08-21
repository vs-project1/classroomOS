import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

export type ContextTab = {
  key: string;
  label: string;
  href: string;
};

type ContextHeaderProps = {
  crumbs: Crumb[];
  backHref: string;
  backLabel: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: ContextTab[];
  activeTab?: string;
  tabTestIdPrefix?: string;
};

/**
 * Level-2 entity header: breadcrumbs, back link to the parent domain,
 * entity title/meta, optional action slot, and URL-driven section tabs.
 * The active tab is styled like the sidebar's active item.
 */
export function ContextHeader({
  crumbs,
  backHref,
  backLabel,
  title,
  meta,
  actions,
  tabs,
  activeTab,
  tabTestIdPrefix = "context-tab",
}: ContextHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={crumbs} />

      <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              data-testid="context-back-link"
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-2 font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground truncate">
              {title}
            </h1>
            {meta && <div className="mt-1.5">{meta}</div>}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>

        {tabs && tabs.length > 0 && (
          <nav
            aria-label="Section navigation"
            className="flex flex-wrap gap-2 pt-4 border-t border-border/40"
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  data-testid={`${tabTestIdPrefix}-${tab.key}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
