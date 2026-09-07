"use client";

import { useActionState, useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createSession, type SessionActionState } from "@/features/sessions/actions/session-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNepaliDate } from "@/lib/nepali-date";
import { formatTime12h } from "@/lib/timezone";
import {
  CalendarDays,
  Clock,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Check,
} from "lucide-react";

export interface RoutineSlotInfo {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    semester?: string | null;
  };
}

export interface MergedClassBlock {
  blockId: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    semester?: string | null;
  };
  startTime: string;
  endTime: string;
  room: string | null;
  periodCount: number;
  routineId: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  code: string;
}

export interface SessionFormProps {
  subjects?: SubjectInfo[];
  routineSlots?: RoutineSlotInfo[];
  userRole?: "ADMIN" | "TEACHER" | "CR";
  defaultValues?: {
    subjectId?: string;
    startTime?: string;
    endTime?: string;
    routineId?: string;
    sessionDate?: string;
  };
}

const initialState: SessionActionState = {
  success: false,
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: string } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function getTodayIsoDate(): string {
  // Get YYYY-MM-DD in Asia/Kathmandu
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}

function getTodayNepalTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function SessionForm({
  subjects = [],
  routineSlots = [],
  userRole = "TEACHER",
  defaultValues,
}: SessionFormProps) {
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const [sessionDate, setSessionDate] = useState(defaultValues?.sessionDate || todayIso);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(defaultValues?.routineId || null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(defaultValues?.subjectId || "");
  const [startTime, setStartTime] = useState(defaultValues?.startTime || getTodayNepalTime());
  const [endTime, setEndTime] = useState(defaultValues?.endTime || "");
  const [routineId, setRoutineId] = useState<string | undefined>(defaultValues?.routineId);
  const [showHomework, setShowHomework] = useState(false);

  // Compute Day of Week for chosen date
  const dayOfWeek = useMemo(() => {
    if (!sessionDate) return new Date().getDay();
    const [year, month, day] = sessionDate.split("-").map(Number);
    if (!year || !month || !day) return new Date().getDay();
    return new Date(year, month - 1, day).getDay();
  }, [sessionDate]);

  // Filter routine slots for this day of week, merging consecutive periods of the same subject
  const mergedDayBlocks = useMemo<MergedClassBlock[]>(() => {
    const rawSlots = (routineSlots || []).filter((slot) => slot.dayOfWeek === dayOfWeek);
    const sorted = [...rawSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const merged: MergedClassBlock[] = [];
    for (const slot of sorted) {
      const lastBlock = merged[merged.length - 1];
      if (
        lastBlock &&
        lastBlock.subjectId === slot.subjectId &&
        lastBlock.endTime === slot.startTime
      ) {
        // Consecutive period of same subject -> merge into single session block
        lastBlock.endTime = slot.endTime;
        lastBlock.periodCount += 1;
        if (!lastBlock.room && slot.room) lastBlock.room = slot.room;
      } else {
        merged.push({
          blockId: slot.id,
          subjectId: slot.subjectId,
          subject: slot.subject,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          periodCount: 1,
          routineId: slot.id,
        });
      }
    }
    return merged;
  }, [routineSlots, dayOfWeek]);

  // Is teacher blocked because they have no scheduled classes on this day?
  const isTeacherBlocked = userRole === "TEACHER" && mergedDayBlocks.length === 0;

  // Auto-select initial slot or reset if date changes
  useEffect(() => {
    if (defaultValues?.routineId) {
      const match = mergedDayBlocks.find(
        (b) => b.routineId === defaultValues.routineId || b.blockId === defaultValues.routineId
      );
      if (match) {
        setSelectedBlockId(match.blockId);
        setSelectedSubjectId(match.subjectId);
        setStartTime(match.startTime);
        setEndTime(match.endTime);
        setRoutineId(match.routineId);
        return;
      }
    }

    // If available blocks exist and current block is not in this day's blocks, pick first block
    if (mergedDayBlocks.length > 0 && !mergedDayBlocks.some((b) => b.blockId === selectedBlockId)) {
      const first = mergedDayBlocks[0];
      setSelectedBlockId(first.blockId);
      setSelectedSubjectId(first.subjectId);
      setStartTime(first.startTime);
      setEndTime(first.endTime);
      setRoutineId(first.routineId);
    } else if (mergedDayBlocks.length === 0) {
      setSelectedBlockId(null);
      setRoutineId(undefined);
    }
  }, [dayOfWeek, mergedDayBlocks, defaultValues?.routineId]);

  const handleSelectBlock = (block: MergedClassBlock) => {
    setSelectedBlockId(block.blockId);
    setSelectedSubjectId(block.subjectId);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setRoutineId(block.routineId);
  };

  const handleSessionAction = useCallback(
    async (_prev: SessionActionState, formData: FormData): Promise<SessionActionState> => {
      try {
        const result = await createSession(initialState, formData);
        if (result.success) {
          toast.success("Class session logged successfully!");
        } else if (result.message) {
          toast.error(result.message);
        }
        return result;
      } catch (error) {
        if (isRedirectError(error)) {
          toast.success("Class session logged successfully!");
        }
        throw error;
      }
    },
    []
  );

  const [state, formAction, isPending] = useActionState(handleSessionAction, initialState);

  // Nepali formatted date preview for display
  const nepaliDateDisplay = useMemo(() => {
    try {
      return formatNepaliDate(new Date(sessionDate));
    } catch {
      return "";
    }
  }, [sessionDate]);

  return (
    <div className="w-full max-w-6xl">
      <form action={formAction}>
        {routineId && <input type="hidden" name="routineId" value={routineId} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Date & Schedule Picker */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/30">
                <div>
                  <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" /> Class Schedule
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the date to load scheduled slots.
                  </p>
                </div>
                {nepaliDateDisplay && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {nepaliDateDisplay}
                  </span>
                )}
              </div>

              {/* Date of Class & Day */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sessionDate" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    type="date"
                    id="sessionDate"
                    name="sessionDate"
                    required
                    max={todayIso}
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                  {state.fieldErrors?.sessionDate && (
                    <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.sessionDate[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Day
                  </Label>
                  <div className="h-9 px-3 rounded-md border border-border/40 bg-muted/20 flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{DAYS[dayOfWeek]}</span>
                  </div>
                </div>
              </div>

              {/* Scheduled Classes for this Day */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Routine Slots ({DAYS[dayOfWeek]})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {mergedDayBlocks.length} {mergedDayBlocks.length === 1 ? "class" : "classes"} found
                  </span>
                </div>

                {mergedDayBlocks.length > 0 ? (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {mergedDayBlocks.map((block) => {
                      const isSelected = selectedBlockId === block.blockId;
                      return (
                        <button
                          key={block.blockId}
                          type="button"
                          onClick={() => handleSelectBlock(block)}
                          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                              : "border-border/60 hover:border-primary/40 bg-background/50 hover:bg-muted/30"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-xs text-foreground truncate">
                                {block.subject.name}
                              </p>
                              {block.periodCount > 1 ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/20 shrink-0">
                                  {block.periodCount} Periods (Double)
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                                  1 Period
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span>{block.subject.code}</span>
                              {block.room && <span>• {block.room}</span>}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className="text-[11px] font-medium tabular-nums text-foreground bg-muted/40 px-2 py-0.5 rounded">
                              {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
                            </span>
                            {isSelected && (
                              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : isTeacherBlocked ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-xs">No classes scheduled on {DAYS[dayOfWeek]}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Teachers can only log sessions on days when they teach. Please pick a date when you had a scheduled class.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
                    No routine slots for {DAYS[dayOfWeek]}. You may select timings manually below.
                  </div>
                )}
              </div>

              {/* Subject & Timing (Routine-Driven) */}
              {!isTeacherBlocked && (
                <div className="space-y-3 pt-3 border-t border-border/20">
                  {mergedDayBlocks.length > 0 ? (
                    <div className="space-y-2">
                      <input type="hidden" name="startTime" value={startTime} />
                      <input type="hidden" name="endTime" value={endTime} />
                      <input type="hidden" name="subjectId" value={selectedSubjectId} />
                      <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-primary" /> Subject:
                          </span>
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {subjects.find((s) => s.id === selectedSubjectId)?.name || "Selected Subject"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/20">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Routine Timings:
                          </span>
                          <span className="font-bold text-foreground">
                            {formatTime12h(startTime)} – {formatTime12h(endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback when no routine slots exist for Admin/CR */
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="subjectId" className="text-xs font-semibold text-muted-foreground">
                          Subject
                        </Label>
                        <select
                          id="subjectId"
                          name="subjectId"
                          required
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          disabled={isPending}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        >
                          <option value="">Select subject...</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                        {state.fieldErrors?.subjectId && (
                          <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.subjectId[0]}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="manualStartTime" className="text-[11px] font-semibold text-muted-foreground">
                            Start Time
                          </Label>
                          <Input
                            type="time"
                            id="manualStartTime"
                            name="startTime"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="manualEndTime" className="text-[11px] font-semibold text-muted-foreground">
                            End Time
                          </Label>
                          <Input
                            type="time"
                            id="manualEndTime"
                            name="endTime"
                            required
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Lecture Content, Homework & Submission */}
          <div className="lg:col-span-7 space-y-4">
            {!isTeacherBlocked ? (
              <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm space-y-4">
                <div className="pb-3 border-b border-border/30">
                  <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Lecture &amp; Academic Content
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record topics covered and any optional assignments for students.
                  </p>
                </div>

                {/* Topics Covered */}
                <div className="space-y-1.5">
                  <Label htmlFor="topicsCovered" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Topics Covered <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="topicsCovered"
                    name="topicsCovered"
                    required
                    placeholder="e.g. Chapter 4: Object-Oriented Concepts, Abstract Classes vs Interfaces with coding demo"
                    className="min-h-[100px] resize-y text-xs leading-relaxed"
                  />
                  {state.fieldErrors?.topicsCovered && (
                    <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.topicsCovered[0]}</p>
                  )}
                </div>

                {/* Session Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Session Notes &amp; Observations <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    required
                    placeholder="e.g. Class participated actively. Students asked for extra practice problems on Polymorphism."
                    className="min-h-[80px] resize-y text-xs leading-relaxed"
                  />
                  {state.fieldErrors?.notes && (
                    <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.notes[0]}</p>
                  )}
                </div>

                {/* Optional Homework Toggle */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Homework Assignment (Optional)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHomework((prev) => !prev)}
                      className="text-xs text-primary h-7 px-2 cursor-pointer"
                    >
                      {showHomework ? "Remove Homework" : "+ Add Homework"}
                    </Button>
                  </div>

                  {showHomework && (
                    <div className="space-y-3 pt-2 border-t border-border/20">
                      <div className="space-y-1">
                        <Label htmlFor="homework" className="text-[11px] font-semibold text-muted-foreground">
                          Instructions &amp; Prompts
                        </Label>
                        <Textarea
                          id="homework"
                          name="homework"
                          placeholder="e.g. Implement an abstract class 'Shape' with subclasses 'Circle' and 'Rectangle'."
                          className="min-h-[75px] resize-y text-xs"
                        />
                        {state.fieldErrors?.homework && (
                          <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.homework[0]}</p>
                        )}
                      </div>

                      <div className="space-y-1 sm:w-1/2">
                        <Label htmlFor="homeworkDueDate" className="text-[11px] font-semibold text-muted-foreground">
                          Submission Deadline
                        </Label>
                        <Input
                          type="date"
                          id="homeworkDueDate"
                          name="homeworkDueDate"
                          min={sessionDate}
                          className="h-9 text-xs"
                        />
                        {state.fieldErrors?.homeworkDueDate && (
                          <p className="text-[11px] font-medium text-destructive">{state.fieldErrors.homeworkDueDate[0]}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Global Error Banner */}
                {!state.success && state.message && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs font-medium">
                    {state.message}
                  </div>
                )}

                {/* Submit Button inside right column */}
                <div className="pt-2 flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={isPending || !selectedSubjectId}
                    className="w-full sm:w-auto px-8 h-10 text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    {isPending ? "Publishing Session..." : "Publish Session"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="h-8 w-8 text-amber-500/60 mb-1" />
                <p className="font-semibold text-foreground text-sm">Select an active class day</p>
                <p className="max-w-xs text-muted-foreground">
                  Session details will appear here once a date with scheduled classes is selected on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
