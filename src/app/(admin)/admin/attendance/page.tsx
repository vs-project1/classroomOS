import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { attendanceCorrectionRequests, attendance, classSessions, subjects, students } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DisputeActions } from "@/features/attendance/components/dispute-actions";
import { formatNepaliDate } from "@/lib/nepali-date";

export default async function AdminAttendancePage() {
  await requireAuth(["ADMIN"]);

  const allRequests = await db
    .select({
      id: attendanceCorrectionRequests.id,
      requestedStatus: attendanceCorrectionRequests.requestedStatus,
      reason: attendanceCorrectionRequests.reason,
      status: attendanceCorrectionRequests.status,
      reviewNote: attendanceCorrectionRequests.reviewNote,
      createdAt: attendanceCorrectionRequests.createdAt,
      studentName: students.name,
      studentRoll: students.rollNumber,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      sessionDate: classSessions.sessionDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(attendance, eq(attendanceCorrectionRequests.attendanceId, attendance.id))
    .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
    .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
    .innerJoin(students, eq(attendanceCorrectionRequests.studentId, students.id))
    .orderBy(desc(attendanceCorrectionRequests.createdAt))
    .limit(100);

  const [pendingCount] = await db
    .select({ count: count() })
    .from(attendanceCorrectionRequests)
    .where(eq(attendanceCorrectionRequests.status, "pending"));

  const pending = allRequests.filter((r) => r.status === "pending");
  const approved = allRequests.filter((r) => r.status === "approved");
  const rejected = allRequests.filter((r) => r.status === "rejected");

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Disputes</h2>
        <p className="text-muted-foreground">
          Review and resolve student attendance correction requests.
          {pendingCount.count > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
              {pendingCount.count} pending
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejected.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No pending disputes.</p>
          ) : (
            pending.map((req) => (
              <DisputeCard key={req.id} req={req} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {approved.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No approved disputes.</p>
          ) : (
            approved.map((req) => (
              <DisputeCard key={req.id} req={req} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejected.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No rejected disputes.</p>
          ) : (
            rejected.map((req) => (
              <DisputeCard key={req.id} req={req} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {allRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No disputes found.</p>
          ) : (
            allRequests.map((req) => (
              <DisputeCard key={req.id} req={req} showActions={req.status === "pending"} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DisputeCard({
  req,
  showActions = false,
}: {
  req: {
    id: string;
    requestedStatus: string;
    reason: string;
    status: string;
    reviewNote: string | null;
    createdAt: Date;
    studentName: string;
    studentRoll: string;
    subjectName: string;
    subjectCode: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
  };
  showActions?: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const sessionDate = req.sessionDate instanceof Date
    ? formatNepaliDate(req.sessionDate)
    : String(req.sessionDate);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{req.studentName}</span>
            <span className="text-xs text-muted-foreground">({req.studentRoll})</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
              {req.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {req.subjectCode} — {req.subjectName} • {sessionDate} {req.startTime}–{req.endTime}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-medium">Requested:</span> Mark as {req.requestedStatus}
        </p>
        <p className="text-sm">
          <span className="font-medium">Reason:</span> {req.reason}
        </p>
        {req.reviewNote && (
          <p className="text-sm">
            <span className="font-medium">Review note:</span> {req.reviewNote}
          </p>
        )}
      </div>

      {showActions && (
        <DisputeActions disputeId={req.id} />
      )}
    </div>
  );
}
