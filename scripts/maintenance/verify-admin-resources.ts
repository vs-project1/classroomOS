import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import {
  users,
  teachers,
  subjects,
  courseUnits,
  courseChapters,
  resources,
} from "../../src/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

async function runVerification() {
  console.log("==================================================");
  console.log("   VERIFY ADMIN RESOURCE MANAGEMENT FOR UNITS    ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Verify Admin User Exists
  const adminUser = await db.query.users.findFirst({
    where: eq(users.role, "ADMIN"),
  });
  assert(Boolean(adminUser), "Admin user exists in database");

  // 2. Verify Course Units exist
  const sampleUnit = await db.query.courseUnits.findFirst({
    where: eq(courseUnits.id, "unit_java_1"),
  });
  assert(Boolean(sampleUnit), "Course unit 'unit_java_1' exists");

  if (!sampleUnit) {
    console.error("Missing sample unit, aborting further tests.");
    process.exit(1);
  }

  // 3. Simulate Admin Adding a Resource to a Unit (via Unit Anchor)
  console.log("\n--- Simulating Admin Adding Resource to 'unit_java_1' ---");
  const targetSubjectId = sampleUnit.subjectId;
  const targetUnitId = sampleUnit.id;

  // Check if unit has chapter or create initial anchor chapter
  let chapter = await db.query.courseChapters.findFirst({
    where: eq(courseChapters.unitId, targetUnitId),
  });

  if (!chapter) {
    const chapId = `chap_test_${Date.now()}`;
    await db.insert(courseChapters).values({
      id: chapId,
      unitId: targetUnitId,
      title: sampleUnit.title,
      order: 1,
    });
    chapter = await db.query.courseChapters.findFirst({
      where: eq(courseChapters.id, chapId),
    });
  }

  assert(Boolean(chapter), "Chapter exists or was created under unit");

  // Insert test resource uploaded by Admin (uploadedBy can be null or admin's teacherId)
  const testResId = `res_admin_test_${Date.now()}`;
  await db.insert(resources).values({
    id: testResId,
    subjectId: targetSubjectId,
    chapterId: chapter!.id,
    title: "Admin Test Slide Presentation",
    fileUrl: "https://docs.google.com/presentation/d/test1234/preview",
    fileType: "slides",
    description: "Sample presentation uploaded by Admin",
    uploadedBy: null, // Admin uploader without teacherId
  });

  const insertedResource = await db.query.resources.findFirst({
    where: eq(resources.id, testResId),
    with: {
      chapter: {
        with: {
          unit: true,
        },
      },
      subject: true,
    },
  });

  assert(Boolean(insertedResource), "Resource was successfully inserted by Admin");
  assert(insertedResource?.subjectId === targetSubjectId, "Resource correctly associated with Subject");
  assert(insertedResource?.chapter?.unitId === targetUnitId, "Resource correctly associated with Unit via chapter");
  assert(insertedResource?.uploadedBy === null, "Admin resource allows null uploadedBy (no teacher profile required)");

  // 4. Verify Structured View Query (as rendered in ResourcesWorkspace)
  console.log("\n--- Verifying Structured View Query ---");
  const subjectWithUnits = await db.query.subjects.findFirst({
    where: eq(subjects.id, targetSubjectId),
    with: {
      courseUnits: {
        where: eq(courseUnits.id, targetUnitId),
        with: {
          courseChapters: {
            with: {
              resources: {
                where: eq(resources.id, testResId),
              },
            },
          },
        },
      },
    },
  });

  const foundInTree = subjectWithUnits?.courseUnits[0]?.courseChapters[0]?.resources[0];
  assert(Boolean(foundInTree && foundInTree.id === testResId), "Resource is correctly nested in Unit -> Chapter hierarchy");

  // 5. Cleanup test resource
  console.log("\n--- Cleaning up test records ---");
  await db.delete(resources).where(eq(resources.id, testResId));
  const postDelete = await db.query.resources.findFirst({
    where: eq(resources.id, testResId),
  });
  assert(!postDelete, "Test resource cleanly removed after verification");

  console.log(`\nVerification Complete: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
