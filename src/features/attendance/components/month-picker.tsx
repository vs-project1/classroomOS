"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { formatNepaliDate } from "@/lib/nepali-date";

export function MonthPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const currentMonthParam = searchParams.get("month") || "all";

  // Generate last 6 months + "All Time"
  const getMonthOptions = () => {
    const options = [{ value: "all", label: "All Time (Semester)" }];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatNepaliDate(d, "YYYY MMMM");
      options.push({ value, label });
    }
    
    return options;
  };

  const options = getMonthOptions();

  const handleValueChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") {
      params.delete("month");
    } else {
      params.set("month", val);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Select value={currentMonthParam} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Select Month" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
