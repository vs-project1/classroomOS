import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log("🚀 Starting user_id schema migration & backfill...");

  // 1. Inspect students table columns
  const studentsTableInfo = await client.execute("PRAGMA table_info(students)");
  const studentColumns = studentsTableInfo.rows.map((r) => r.name as string);

  if (!studentColumns.includes("user_id")) {
    console.log("➕ Adding column 'user_id' to 'students' table...");
    await client.execute("ALTER TABLE students ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    console.log("✅ Column 'user_id' added to 'students'.");
  } else {
    console.log("ℹ️ Column 'user_id' already exists in 'students'.");
  }

  // 2. Inspect teachers table columns
  const teachersTableInfo = await client.execute("PRAGMA table_info(teachers)");
  const teacherColumns = teachersTableInfo.rows.map((r) => r.name as string);

  if (!teacherColumns.includes("user_id")) {
    console.log("➕ Adding column 'user_id' to 'teachers' table...");
    await client.execute("ALTER TABLE teachers ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    console.log("✅ Column 'user_id' added to 'teachers'.");
  } else {
    console.log("ℹ️ Column 'user_id' already exists in 'teachers'.");
  }

  // 3. Backfill students.user_id from student_profiles (via roll_number)
  console.log("🔄 Backfilling students.user_id from student_profiles...");
  await client.execute(`
    UPDATE students 
    SET user_id = (
      SELECT user_id FROM student_profiles 
      WHERE student_profiles.roll_number = students.roll_number
      LIMIT 1
    )
    WHERE user_id IS NULL AND roll_number IN (SELECT roll_number FROM student_profiles)
  `);

  // 4. Backfill any remaining students.user_id from users (via email)
  console.log("🔄 Backfilling remaining students.user_id from users table by email...");
  await client.execute(`
    UPDATE students 
    SET user_id = (
      SELECT id FROM users 
      WHERE users.email = students.email
      LIMIT 1
    )
    WHERE user_id IS NULL AND email IN (SELECT email FROM users)
  `);

  // 5. Backfill teachers.user_id from users (via email)
  console.log("🔄 Backfilling teachers.user_id from users table by email...");
  await client.execute(`
    UPDATE teachers 
    SET user_id = (
      SELECT id FROM users 
      WHERE users.email = teachers.email
      LIMIT 1
    )
    WHERE user_id IS NULL AND email IN (SELECT email FROM users)
  `);

  // 6. Verification
  const studentsCount = await client.execute("SELECT COUNT(*) as total, COUNT(user_id) as linked FROM students");
  console.log("📊 Students Migration Status:", studentsCount.rows[0]);

  const teachersCount = await client.execute("SELECT COUNT(*) as total, COUNT(user_id) as linked FROM teachers");
  console.log("📊 Teachers Migration Status:", teachersCount.rows[0]);

  // Test sample student query that failed previously
  const sampleStudent = await client.execute({
    sql: 'SELECT id, user_id, name, roll_number, email FROM students WHERE roll_number = ? LIMIT 1',
    args: ['2025-BCA-002']
  });
  console.log("🔍 Verification sample (std_002):", sampleStudent.rows[0]);

  console.log("🎉 Migration and backfill completed successfully!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
