import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { attendanceCorrectionRequests, dailyAttendance, dailySessions, students } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DisputeCard } from "@/features/attendance/components/dispute-card";
import { EmptyState } from "@/components/ui/empty-state";

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
      semester: dailySessions.semester,
      sessionDate: dailySessions.date,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(dailyAttendance, eq(attendanceCorrectionRequests.attendanceId, dailyAttendance.id))
    .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
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
            <EmptyState className="py-8" description="No pending disputes." />
          ) : (
            pending.map((req) => (
              <DisputeCard key={req.id} req={req} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {approved.length === 0 ? (
            <EmptyState className="py-8" description="No approved disputes." />
          ) : (
            approved.map((req) => (
              <DisputeCard key={req.id} req={req} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejected.length === 0 ? (
            <EmptyState className="py-8" description="No rejected disputes." />
          ) : (
            rejected.map((req) => (
              <DisputeCard key={req.id} req={req} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {allRequests.length === 0 ? (
            <EmptyState className="py-8" description="No disputes found." />
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

