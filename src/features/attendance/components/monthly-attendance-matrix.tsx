"use client";

import { useState, useMemo, useTransition } from "react";
import { 
  MonthlyAttendanceMatrixResult, 
  getMonthlyAttendanceMatrixAction 
} from "@/features/attendance/actions/monthly";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialData: MonthlyAttendanceMatrixResult;
  availableSemesters?: string[];
  currentSemester: string;
}

const NEPALI_MONTHS = [
  { index: 0, name: "Baisakh (वैशाख)" },
  { index: 1, name: "Jestha (जेठ)" },
  { index: 2, name: "Asar (असार)" },
  { index: 3, name: "Shrawan (श्रावण)" },
  { index: 4, name: "Bhadra (भदौ)" },
  { index: 5, name: "Ashwin (असोज)" },
  { index: 6, name: "Kartik (कार्तिक)" },
  { index: 7, name: "Mangsir (मंसिर)" },
  { index: 8, name: "Poush (पुष)" },
  { index: 9, name: "Magh (माघ)" },
  { index: 10, name: "Falgun (फागुन)" },
  { index: 11, name: "Chaitra (चैत)" },
];

export function MonthlyAttendanceMatrix({ initialData, availableSemesters, currentSemester }: Props) {
  const [data, setData] = useState<MonthlyAttendanceMatrixResult>(initialData);
  const [selectedSemester, setSelectedSemester] = useState(currentSemester);
  const [selectedYear, setSelectedYear] = useState(initialData.year || 2083);
  const [selectedMonth, setSelectedMonth] = useState(initialData.monthIndex ?? 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    startTransition(async () => {
      const res = await getMonthlyAttendanceMatrixAction(selectedSemester, selectedYear, newMonth);
      setData(res);
    });
  };

  const handleSemesterChange = (newSem: string) => {
    setSelectedSemester(newSem);
    startTransition(async () => {
      const res = await getMonthlyAttendanceMatrixAction(newSem, selectedYear, selectedMonth);
      setData(res);
    });
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.students;
    return data.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
    );
  }, [data.students, searchQuery]);

  const handleExportCSV = () => {
    const headers = ["Roll Number", "Student Name", ...data.days.map((d) => `Day ${d.dayNumber}`), "Present", "Absent", "Late", "Excused", "Attendance %"];
    const rows = data.students.map((s) => {
      const dayStatuses = data.days.map((d) => s.records[d.dayNumber] || (d.hasSession ? "present" : "-"));
      return [
        `"${s.rollNumber}"`,
        `"${s.name}"`,
        ...dayStatuses.map((st) => `"${st}"`),
        s.presentCount,
        s.absentCount,
        s.lateCount,
        s.excusedCount,
        `"${s.percentage}%"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monthly_Attendance_${data.semester.replace(/\s+/g, "_")}_${data.monthName}_${data.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="w-3.5 h-3.5" />
              {selectedSemester}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              Year {selectedYear} BS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Monthly Attendance Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete day-by-day morning roll call matrix for {data.monthName} {selectedYear}.
          </p>
        </div>

        {/* Month Selector Carousel / Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {availableSemesters && availableSemesters.length > 1 && (
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              disabled={isPending}
              className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-xs"
            >
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            disabled={isPending}
            className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-xs"
          >
            {NEPALI_MONTHS.map((m) => (
              <option key={m.index} value={m.index}>{m.name}</option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-10 gap-1.5 rounded-xl border-border/80"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Total Enrolled</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{data.stats.totalStudents}</span>
            <Users className="w-4 h-4 text-muted-foreground/60" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Roll Calls Taken</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-primary">{data.stats.totalSessions} Days</span>
            <Calendar className="w-4 h-4 text-primary/60" />
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Average Rate</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.stats.overallAttendancePct}%</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Month Days</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{data.days.length} Days</span>
            <Clock className="w-4 h-4 text-muted-foreground/60" />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student by name or roll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card"
          />
        </div>
        
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> P = Present</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> A = Absent</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> L = Late</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> E = Excused</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></span> — = No Class</span>
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-xs relative">
        {isPending && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2 font-medium text-sm text-primary">
              <Clock className="w-4 h-4 animate-spin" /> Loading Month Data...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-3 w-10 text-center sticky left-0 z-20 bg-muted/90 backdrop-blur-md">#</th>
                <th className="py-3 px-3 min-w-[120px] sticky left-10 z-20 bg-muted/90 backdrop-blur-md">Roll No</th>
                <th className="py-3 px-4 min-w-[160px] sticky left-[160px] z-20 bg-muted/90 backdrop-blur-md border-r">Student Name</th>
                <th className="py-3 px-3 text-center min-w-[70px] border-r">Rate</th>

                {data.days.map((d) => (
                  <th
                    key={d.dayNumber}
                    className={cn(
                      "py-2 px-1 text-center min-w-[32px] font-mono",
                      d.isWeekend && "bg-rose-500/5 text-rose-600 dark:text-rose-400",
                      d.hasSession && "font-bold text-foreground"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground uppercase">{d.dayOfWeek}</span>
                      <span>{d.dayNumber}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground sticky left-0 z-10 bg-card">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground sticky left-10 z-10 bg-card">
                      <span className="px-1.5 py-0.5 rounded bg-muted/60 border text-[11px]">
                        {std.rollNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-foreground sticky left-[160px] z-10 bg-card border-r">
                      {std.name}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-bold",
                          std.percentage >= 80
                            ? "bg-emerald-500/10 text-emerald-600"
                            : std.percentage >= 60
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                        )}
                      >
                        {std.percentage}%
                      </span>
                    </td>

                    {/* Day Cells */}
                    {data.days.map((d) => {
                      const status = std.records[d.dayNumber];
                      if (!d.hasSession) {
                        return (
                          <td
                            key={d.dayNumber}
                            className={cn(
                              "py-2.5 px-1 text-center text-muted-foreground/30 font-mono text-[11px]",
                              d.isWeekend && "bg-rose-500/[0.02]"
                            )}
                          >
                            —
                          </td>
                        );
                      }

                      return (
                        <td
                          key={d.dayNumber}
                          className={cn(
                            "py-2.5 px-1 text-center font-bold text-[11px]",
                            status === "present" && "text-emerald-600 bg-emerald-500/5",
                            status === "absent" && "text-rose-600 bg-rose-500/10",
                            status === "late" && "text-amber-600 bg-amber-500/10",
                            status === "excused" && "text-indigo-600 bg-indigo-500/10"
                          )}
                        >
                          {status === "present" ? "P" : status === "absent" ? "A" : status === "late" ? "L" : "E"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={data.days.length + 4} className="py-12 text-center text-muted-foreground text-sm">
                    No students match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
