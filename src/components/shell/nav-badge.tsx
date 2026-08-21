import { cn } from "@/lib/utils";

/**
 * Count pill for navigation items. Renders nothing when the count is 0 or
 * undefined; caps display at "9+". `data-slot="nav-badge"` is the test hook.
 */
export function NavBadge({ count }: { count: number | undefined }) {
  if (!count || count <= 0) return null;
  return (
    <span
      data-slot="nav-badge"
      className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
        "bg-primary/15 text-primary min-w-[20px] text-center"
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
