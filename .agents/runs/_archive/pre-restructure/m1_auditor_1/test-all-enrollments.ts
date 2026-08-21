import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { enrollments, students, subjects } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const stdList = await db.select().from(students);
  const subjList = await db.select().from(subjects);

  console.log("Students count in DB:", stdList.length);
  console.log("Subjects count in DB:", subjList.length);

  const existingEnr = await db.select().from(enrollments);
  console.log("Existing enrollments:", existingEnr.length);

  for (const s of stdList) {
    for (const subj of subjList) {
      const id = `test_enr_${s.id}_${subj.id}`;
      try {
        await db.insert(enrollments).values({
          id,
          studentId: s.id,
          subjectId: subj.id,
          semester: 4,
          enrolledAt: new Date("2026-07-20T00:00:00.000Z"),
        });
        console.log(`✓ Inserted enrollment: ${id}`);
      } catch (err: any) {
        console.error(`✗ Failed enrollment: ${id}`, err.message);
        if (err.cause) console.error("   Cause:", err.cause);
      }
    }
  }

  // Cleanup test enrollments
  for (const s of stdList) {
    for (const subj of subjList) {
      const id = `test_enr_${s.id}_${subj.id}`;
      await db.delete(enrollments).where(eq(enrollments.id, id));
    }
  }
  console.log("Cleaned up test enrollments.");
}

main().catch(console.error);
