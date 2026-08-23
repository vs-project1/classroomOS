"use client";

import { useActionState, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createSession, getStudentsBySubject, type SessionActionState } from "@/features/sessions/actions/session-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StudentInfo = {
  id: string;
  name: string;
  rollNumber: string;
};

type SubjectInfo = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  subjects: SubjectInfo[];
  defaultValues?: {
    subjectId?: string;
    startTime?: string;
    endTime?: string;
    routineId?: string;
    sessionDate?: string;
  };
};

type AttendanceState = {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
};

const initialState: SessionActionState = {
  success: false,
};

function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: string } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function SessionForm({ subjects, defaultValues }: Props) {
  const handleSessionAction = useCallback(
    async (_prev: SessionActionState, formData: FormData): Promise<SessionActionState> => {
      try {
        const result = await createSession(initialState, formData);
        if (result.success) {
          toast.success(
            "Session published.",
            enrolledStudents.length > 0
              ? { description: `${enrolledStudents.length} students can now see today's class.` }
              : undefined
          );
        } else if (result.message) {
          toast.error(result.message);
        }
        return result;
      } catch (error) {
        if (isRedirectError(error)) {
          toast.success(
            "Session published.",
            enrolledStudents.length > 0
              ? { description: `${enrolledStudents.length} students can now see today's class.` }
              : undefined
          );
        }
        throw error;
      }
    },
    [enrolledStudents.length]
  );

  const [state, formAction, isPending] = useActionState(handleSessionAction, initialState);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState(defaultValues?.subjectId || "");
  const [enrolledStudents, setEnrolledStudents] = useState<StudentInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [attendance, setAttendance] = useState<AttendanceState[]>([]);

  const fetchEnrolledStudents = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      setEnrolledStudents([]);
      setAttendance([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const students = await getStudentsBySubject(subjectId);
      setEnrolledStudents(students);
      setAttendance(students.map(s => ({ studentId: s.id, status: "present" as const })));
    } catch {
      setEnrolledStudents([]);
      setAttendance([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrolledStudents(selectedSubjectId);
  }, [selectedSubjectId, fetchEnrolledStudents]);

  const handleStatusChange = (studentId: string, status: AttendanceState["status"]) => {
    setAttendance(prev =>
      prev.map(a => a.studentId === studentId ? { ...a, status } : a)
    );
  };

  const markAllPresent = () => {
    setAttendance(prev => prev.map(a => ({ ...a, status: "present" as const })));
  };

  const markedCount = attendance.length;
  const totalCount = enrolledStudents.length;
  const exceptionCount = attendance.filter(a => a.status !== "present").length;

  const getNepalDateString = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  const getNepalTimeString = () => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  };

  return (
    <div className="mb-8 max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium">Record session details and attendance in one go.</h3>
      </div>
      <form action={formAction} className="space-y-8">
        {/* Hidden JSON field for attendance array */}
        <input type="hidden" name="attendanceJson" value={JSON.stringify(attendance)} />
        {/* Optional routineId */}
        {defaultValues?.routineId && (
          <input type="hidden" name="routineId" value={defaultValues.routineId} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="subjectId" className="text-sm font-medium">Subject</Label>
            <select 
              id="subjectId" 
              name="subjectId" 
              required 
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            {state.fieldErrors?.subjectId && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.subjectId[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionDate" className="text-sm font-medium">Session Date</Label>
            <Input type="date" id="sessionDate" name="sessionDate" required defaultValue={defaultValues?.sessionDate || getNepalDateString()} className="h-10" />
            {state.fieldErrors?.sessionDate && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.sessionDate[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
            <Input type="time" id="startTime" name="startTime" required defaultValue={defaultValues?.startTime || getNepalTimeString()} className="h-10" />
            {state.fieldErrors?.startTime && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.startTime[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
            <Input type="time" id="endTime" name="endTime" required defaultValue={defaultValues?.endTime || ""} className="h-10" />
            {state.fieldErrors?.endTime && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.endTime[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topicsCovered" className="text-sm font-medium">Topics Covered</Label>
            <Textarea id="topicsCovered" name="topicsCovered" required placeholder="e.g. Introduction to Variables" className="min-h-[100px] resize-y" />
            {state.fieldErrors?.topicsCovered && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.topicsCovered[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="homework" className="text-sm font-medium">Assign Homework for Submission</Label>
            <Textarea id="homework" name="homework" placeholder="Detailed homework description for student submission... (optional)" className="min-h-[100px] resize-y" />
            {state.fieldErrors?.homework && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.homework[0]}</p>
            )}
          </div>

          <div className="space-y-2 md:w-1/2">
            <Label htmlFor="homeworkDueDate" className="text-sm font-medium">Homework Submission Date</Label>
            <Input type="date" id="homeworkDueDate" name="homeworkDueDate" className="h-10" />
            {state.fieldErrors?.homeworkDueDate && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.homeworkDueDate[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea id="notes" name="notes" required placeholder="e.g. Review arrays next class" className="min-h-[100px] resize-y" />
            {state.fieldErrors?.notes && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.notes[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium">Attendance</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Everyone is marked present by default — only change the exceptions.
              </p>
            </div>
            {enrolledStudents.length > 0 && !loadingStudents && (
              <Button
                type="button"
                variant="outline"
                onClick={markAllPresent}
                className="min-h-11 shrink-0"
              >
                All Present
              </Button>
            )}
          </div>
          {totalCount > 0 && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {markedCount}/{totalCount} marked{exceptionCount > 0 ? ` · ${exceptionCount} exception${exceptionCount === 1 ? "" : "s"}` : ""}
            </p>
          )}
          <div className="space-y-2">
            {!selectedSubjectId ? (
              <p className="text-sm text-muted-foreground py-4">Select a subject to see enrolled students.</p>
            ) : loadingStudents ? (
              <p className="text-sm text-muted-foreground py-4">Loading enrolled students...</p>
            ) : enrolledStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No students enrolled in this subject.</p>
            ) : (
              enrolledStudents.map((student) => {
                const currentStatus = attendance.find(a => a.studentId === student.id)?.status || "present";
                return (
                  <div key={student.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                    </div>
                    <select
                      aria-label={`Attendance status for ${student.name}`}
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(student.id, e.target.value as AttendanceState["status"])}
                      className="h-11 min-h-11 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {!state.success && state.message && (
          <p className="text-sm font-medium text-destructive">{state.message}</p>
        )}

        <div className="pt-4">
          <Button type="submit" disabled={isPending} className="w-full md:w-auto px-8">
            {isPending ? "Logging Session..." : "Log Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
