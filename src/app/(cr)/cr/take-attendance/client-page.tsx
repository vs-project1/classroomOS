"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { 
  submitDailyAttendanceAction, 
  getDailyAttendanceForDateAction 
} from "@/features/attendance/actions/daily";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar, 
  Clock, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  Users, 
  ArrowLeft,
  RotateCcw,
  CalendarDays,
  ShieldCheck,
  FileEdit
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import NepaliDate from "nepali-datetime";
import { formatNepaliDate } from "@/lib/nepali-date";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

interface Props {
  roster: Student[];
  semester: string;
  initialNepaliDate: string;
  initialGregorianDate: string;
}

type Status = "present" | "absent" | "late" | "excused";

export function DailyAttendanceClient({ roster, semester, initialNepaliDate, initialGregorianDate }: Props) {
  // ISO date string "YYYY-MM-DD" for the HTML date picker
  const [selectedIsoDate, setSelectedIsoDate] = useState(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  });

  const [attendance, setAttendance] = useState<Record<string, Status>>(
    roster.reduce((acc, s) => ({ ...acc, [s.id]: "present" }), {})
  );

  const [existingSessionInfo, setExistingSessionInfo] = useState<{
    id: string;
    markedByName: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [loadingDate, setLoadingDate] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | Status>("all");

  // Format the currently selected date into Nepali and Gregorian
  const formattedDates = useMemo(() => {
    try {
      const [y, m, d] = selectedIsoDate.split("-").map(Number);
      const jsDate = new Date(y, m - 1, d, 12, 0, 0);
      const ndStr = formatNepaliDate(jsDate, "dddd, YYYY MMMM DD");
      const engStr = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(jsDate);
      return { nepali: ndStr, gregorian: engStr, jsDate };
    } catch {
      return { nepali: initialNepaliDate, gregorian: initialGregorianDate, jsDate: new Date() };
    }
  }, [selectedIsoDate, initialNepaliDate, initialGregorianDate]);

  // When selected date changes, fetch if attendance is already saved for that date
  const loadDateAttendance = async (dateStr: string) => {
    setLoadingDate(true);
    setMessage(null);
    try {
      const existing = await getDailyAttendanceForDateAction(semester, dateStr);
      if (existing && existing.records.length > 0) {
        setExistingSessionInfo({
          id: existing.id,
          markedByName: existing.markedByName,
        });
        const map: Record<string, Status> = {};
        for (const s of roster) {
          map[s.id] = "present";
        }
        for (const r of existing.records) {
          map[r.studentId] = r.status;
        }
        setAttendance(map);
      } else {
        setExistingSessionInfo(null);
        setAttendance(roster.reduce((acc, s) => ({ ...acc, [s.id]: "present" }), {}));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDate(false);
    }
  };

  useEffect(() => {
    loadDateAttendance(selectedIsoDate);
  }, [selectedIsoDate, semester]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const student of roster) {
      const st = attendance[student.id] || "present";
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
      else if (st === "excused") excused++;
    }
    return { total: roster.length, present, absent, late, excused };
  }, [roster, attendance]);

  const filteredRoster = useMemo(() => {
    return roster.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.name?.toLowerCase().includes(q) ||
        student.rollNumber?.toLowerCase().includes(q);

      const studentStatus = attendance[student.id] || "present";
      const matchesStatus = activeFilter === "all" || studentStatus === activeFilter;

      return matchesSearch && matchesStatus;
    });
  }, [roster, searchQuery, activeFilter, attendance]);

  const handleMarkAllPresent = () => {
    setAttendance(roster.reduce((acc, s) => ({ ...acc, [s.id]: "present" }), {}));
  };

  const handleSetStatus = (studentId: string, status: Status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      const [y, m, d] = selectedIsoDate.split("-").map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));

      const res = await submitDailyAttendanceAction(semester, targetDate, records);
      setMessage({ type: res.success ? "success" : "error", text: res.message });
      if (res.success) {
        setExistingSessionInfo({
          id: "saved",
          markedByName: "You",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Context Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/cr" 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to CR Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card border rounded-2xl p-6 shadow-xs">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="w-3.5 h-3.5" />
                {semester}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Daily Attendance
              </span>
              {existingSessionInfo ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved in Database ({existingSessionInfo.markedByName})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <FileEdit className="w-3.5 h-3.5" />
                  New Attendance (Not Submitted)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Take Attendance
            </h1>
            <p className="text-sm text-muted-foreground">
              Taking daily attendance for <strong className="text-foreground">{formattedDates.nepali}</strong>.
            </p>
          </div>

          {/* Interactive Date Picker Box */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 bg-muted/40 border rounded-2xl p-4 lg:min-w-[280px]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                Change Attendance Date:
              </label>
              <input
                type="date"
                value={selectedIsoDate}
                onChange={(e) => setSelectedIsoDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>

            <div className="border-t pt-2 space-y-0.5 text-xs text-muted-foreground">
              <p className="font-semibold text-primary">{formattedDates.nepali}</p>
              <p>{formattedDates.gregorian}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      {message && (
        <div
          data-testid="daily-attendance-result-banner"
          data-banner-type={message.type}
          className={cn(
            "p-4 rounded-xl border flex items-center gap-3 transition-all",
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-destructive" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Total Roster</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{counts.total}</span>
            <Users className="w-4 h-4 text-muted-foreground/60" />
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Marked Present</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.present}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Marked Absent</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{counts.absent}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Marked Late</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.late}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Marked Excused</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{counts.excused}</span>
            <HelpCircle className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              activeFilter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card text-muted-foreground hover:bg-muted border-border"
            )}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setActiveFilter("present")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              activeFilter === "present"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-card text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 border-border"
            )}
          >
            Present ({counts.present})
          </button>
          <button
            onClick={() => setActiveFilter("absent")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              activeFilter === "absent"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-card text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 border-border"
            )}
          >
            Absent ({counts.absent})
          </button>
          <button
            onClick={() => setActiveFilter("late")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              activeFilter === "late"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-card text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border-border"
            )}
          >
            Late ({counts.late})
          </button>
          <button
            onClick={() => setActiveFilter("excused")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              activeFilter === "excused"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-card text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/10 border-border"
            )}
          >
            Excused ({counts.excused})
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllPresent}
            className="h-8 text-xs gap-1.5 ml-auto border-border/80"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All to Present
          </Button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-xs relative">
        {loadingDate && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2 font-medium text-sm text-primary">
              <Clock className="w-4 h-4 animate-spin" /> Checking Date Records...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground font-medium text-xs">
                <th className="py-3.5 px-4 sm:px-6 w-16">#</th>
                <th className="py-3.5 px-4 sm:px-6">Student</th>
                <th className="py-3.5 px-4 sm:px-6">Roll Number</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Status for {selectedIsoDate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRoster.length > 0 ? (
                filteredRoster.map((student, idx) => {
                  const currentStatus = attendance[student.id] || "present";
                  const isAbsent = currentStatus === "absent";
                  const isLate = currentStatus === "late";
                  const isExcused = currentStatus === "excused";

                  return (
                    <tr
                      key={student.id}
                      className={cn(
                        "transition-colors hover:bg-muted/20",
                        isAbsent && "bg-rose-500/[0.04]",
                        isLate && "bg-amber-500/[0.04]",
                        isExcused && "bg-indigo-500/[0.04]"
                      )}
                    >
                      <td className="py-3.5 px-4 sm:px-6 text-xs text-muted-foreground font-mono">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="text-foreground block">{student.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted/60 border">
                          {student.rollNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center p-1 bg-muted/50 border rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "present")}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                              currentStatus === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "absent")}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                              currentStatus === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-rose-600"
                            )}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "late")}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                              currentStatus === "late"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-muted-foreground hover:text-amber-600"
                            )}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "excused")}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                              currentStatus === "excused"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-indigo-600"
                            )}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                    No students match the search query or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-20 bg-card/95 backdrop-blur-md border rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-semibold text-foreground">{formattedDates.nepali}:</span>
          <span className="text-emerald-600 font-medium">{counts.present} Present</span>
          <span>•</span>
          <span className="text-rose-600 font-medium">{counts.absent} Absent</span>
          {counts.late > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-600 font-medium">{counts.late} Late</span>
            </>
          )}
          {counts.excused > 0 && (
            <>
              <span>•</span>
              <span className="text-indigo-600 font-medium">{counts.excused} Excused</span>
            </>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isPending || roster.length === 0}
          size="lg"
          className="w-full sm:w-auto font-semibold px-8"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              Saving Attendance...
            </span>
          ) : existingSessionInfo ? (
            `Update Attendance for ${selectedIsoDate}`
          ) : (
            `Submit Attendance for ${selectedIsoDate}`
          )}
        </Button>
      </div>
    </div>
  );
}
