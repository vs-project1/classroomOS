import { cn } from "@/lib/utils";

type NavBadgeVariant = "default" | "sidebar";

const VARIANT_CLASSES: Record<NavBadgeVariant, string> = {
  // On card/bottom-nav backgrounds (~5:1 vs primary).
  default: "bg-primary/15 text-primary",
  // Sidebar composite (#1E1B4B light / #070B14 dark) drops primary-on-tint to
  // ~2.3:1 — use a light indigo that clears 4.5:1 on both.
  sidebar: "bg-white/10 text-indigo-300",
};

/**
 * Count pill for navigation items. Renders nothing when the count is 0 or
 * undefined; caps display at "9+". Purely visual — screen readers get the
 * count via sr-only text next to the item label. `data-slot="nav-badge"`
 * is the test hook.
 */
export function NavBadge({
  count,
  variant = "default",
}: {
  count: number | undefined;
  variant?: NavBadgeVariant;
}) {
  if (!count || count <= 0) return null;
  return (
    <span
      data-slot="nav-badge"
      aria-hidden="true"
      className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
        "min-w-[20px] text-center",
        VARIANT_CLASSES[variant]
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
