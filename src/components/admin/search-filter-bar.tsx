"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentSemester = searchParams.get("semester") || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        updateQueryParams({ search: searchTerm || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, currentSearch]);

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9 bg-background/50 border-muted rounded-xl h-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <span className="text-sm font-medium text-muted-foreground mr-1 whitespace-nowrap">Semester:</span>
        <Button
          variant={!currentSemester ? "secondary" : "ghost"}
          size="sm"
          className="rounded-full h-8 text-xs font-semibold whitespace-nowrap"
          onClick={() => updateQueryParams({ semester: null })}
        >
          All
        </Button>
        {SEMESTERS.map((sem) => (
          <Button
            key={sem}
            variant={currentSemester === sem ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full h-8 text-xs font-semibold whitespace-nowrap"
            onClick={() => updateQueryParams({ semester: sem })}
          >
            Sem {sem}
          </Button>
        ))}
      </div>
    </div>
  );
}
