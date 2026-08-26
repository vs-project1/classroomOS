"use server";
import { db } from "@/db";
import { dailySessions, dailyAttendance, students } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitDailyAttendanceAction(
  semester: string,
  date: Date,
  records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]
) {
  const user = await requireAuth(["CR", "ADMIN"]);
  
  try {
    await db.transaction(async (tx) => {
      const sessionId = `ds_${crypto.randomUUID()}`;
      
      await tx.insert(dailySessions).values({
        id: sessionId,
        date: date,
        semester,
        markedBy: user.id
      });
      
      const attRecords = records.map(r => ({
        id: `da_${crypto.randomUUID()}`,
        dailySessionId: sessionId,
        studentId: r.studentId,
        status: r.status
      }));
      
      await tx.insert(dailyAttendance).values(attRecords);
    });
    
    revalidatePath("/cr/take-attendance");
    revalidatePath("/attendance/monthly");
    revalidatePath("/attendance");
    return { success: true, message: "Daily attendance logged successfully." };
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE constraint failed") || err?.message?.includes("unq_daily_session_date_sem")) {
      return { success: false, message: "Daily attendance has already been taken for this semester today." };
    }
    console.error(err);
    return { success: false, message: "Failed to log daily attendance." };
  }
}
