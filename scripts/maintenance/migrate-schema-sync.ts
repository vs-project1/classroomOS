import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@libsql/client";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("ℹ️ DATABASE_URL not set; skipping database schema sync.");
    return;
  }

  console.log("🌐 Connecting to database:", databaseUrl);
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // 1. Create telegram_settings table
  console.log("📦 Creating telegram_settings table if not exists...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS telegram_settings (
      id text PRIMARY KEY NOT NULL,
      bot_token text NOT NULL,
      bot_username text,
      is_enabled integer DEFAULT 1 NOT NULL,
      morning_brief_time text DEFAULT '05:30' NOT NULL,
      evening_brief_time text DEFAULT '20:00' NOT NULL,
      weekend_days text DEFAULT '[0, 6]' NOT NULL,
      cron_secret text NOT NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL
    );
  `);
  console.log("✅ telegram_settings ready.");

  // 2. Create semester_telegram_configs table
  console.log("📦 Creating semester_telegram_configs table if not exists...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS semester_telegram_configs (
      id text PRIMARY KEY NOT NULL,
      semester text NOT NULL UNIQUE,
      chat_id text NOT NULL,
      message_thread_id integer,
      chat_title text,
      auto_morning_brief integer DEFAULT 1 NOT NULL,
      auto_evening_brief integer DEFAULT 1 NOT NULL,
      auto_notices integer DEFAULT 1 NOT NULL,
      last_routine_modified_at integer,
      last_routine_published_at integer,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL
    );
  `);
  console.log("✅ semester_telegram_configs ready.");

  // 3. Create telegram_broadcast_logs table
  console.log("📦 Creating telegram_broadcast_logs table if not exists...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS telegram_broadcast_logs (
      id text PRIMARY KEY NOT NULL,
      semester text NOT NULL,
      type text NOT NULL,
      date text,
      message_text text NOT NULL,
      status text NOT NULL,
      error_message text,
      sent_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_created ON telegram_broadcast_logs (created_at);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_semester ON telegram_broadcast_logs (semester);`);

  // Check telegram_broadcast_logs columns (date)
  const logsInfo = await client.execute("PRAGMA table_info(telegram_broadcast_logs)");
  const logsCols = logsInfo.rows.map((r) => r.name as string);
  if (!logsCols.includes("date")) {
    console.log("➕ Adding column 'date' to telegram_broadcast_logs table...");
    await client.execute("ALTER TABLE telegram_broadcast_logs ADD COLUMN date text");
    console.log("✅ Added date to telegram_broadcast_logs.");
  }
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_dedup ON telegram_broadcast_logs (semester, type, date);`);
  console.log("✅ telegram_broadcast_logs ready.");

  // 4. Check students columns
  const studentsInfo = await client.execute("PRAGMA table_info(students)");
  const studentCols = studentsInfo.rows.map((r) => r.name as string);
  if (!studentCols.includes("user_id")) {
    console.log("➕ Adding column 'user_id' to students table...");
    await client.execute("ALTER TABLE students ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    console.log("✅ Added user_id to students.");
  } else {
    console.log("ℹ️ students.user_id already exists.");
  }

  // 5. Check teachers columns
  const teachersInfo = await client.execute("PRAGMA table_info(teachers)");
  const teacherCols = teachersInfo.rows.map((r) => r.name as string);
  if (!teacherCols.includes("user_id")) {
    console.log("➕ Adding column 'user_id' to teachers table...");
    await client.execute("ALTER TABLE teachers ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    console.log("✅ Added user_id to teachers.");
  } else {
    console.log("ℹ️ teachers.user_id already exists.");
  }

  // 5b. Check resources columns (unit_id)
  const resourcesInfo = await client.execute("PRAGMA table_info(resources)");
  const resourcesCols = resourcesInfo.rows.map((r) => r.name as string);
  if (!resourcesCols.includes("unit_id")) {
    console.log("➕ Adding column 'unit_id' to resources table...");
    await client.execute("ALTER TABLE resources ADD COLUMN unit_id TEXT REFERENCES course_units(id) ON DELETE SET NULL");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_resources_unit ON resources (unit_id)");
    console.log("✅ Added unit_id to resources and created index idx_resources_unit.");
  } else {
    console.log("ℹ️ resources.unit_id already exists.");
  }

  // 6. Backfill user_ids
  console.log("🔄 Backfilling user_id mappings...");
  await client.execute(`
    UPDATE students 
    SET user_id = (
      SELECT user_id FROM student_profiles 
      WHERE student_profiles.roll_number = students.roll_number
      LIMIT 1
    )
    WHERE user_id IS NULL AND roll_number IN (SELECT roll_number FROM student_profiles)
  `);

  await client.execute(`
    UPDATE students 
    SET user_id = (
      SELECT id FROM users 
      WHERE users.email = students.email
      LIMIT 1
    )
    WHERE user_id IS NULL AND email IN (SELECT email FROM users)
  `);

  await client.execute(`
    UPDATE teachers 
    SET user_id = (
      SELECT id FROM users 
      WHERE users.email = teachers.email
      LIMIT 1
    )
    WHERE user_id IS NULL AND email IN (SELECT email FROM users)
  `);
  // 7. Sync attendance_correction_requests foreign key to daily_attendance
  try {
    const fks = await client.execute("PRAGMA foreign_key_list(attendance_correction_requests)");
    const attendanceFk = fks.rows.find((r) => r.from === "attendance_id");
    if (attendanceFk && attendanceFk.table !== "daily_attendance") {
      console.log("🔄 Updating attendance_correction_requests foreign key to daily_attendance...");
      await client.execute("PRAGMA foreign_keys = OFF;");
      await client.execute(`
        CREATE TABLE IF NOT EXISTS attendance_correction_requests_new (
          id text PRIMARY KEY NOT NULL,
          attendance_id text NOT NULL REFERENCES daily_attendance(id) ON DELETE CASCADE,
          student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          requested_status text NOT NULL,
          reason text NOT NULL,
          status text DEFAULT 'pending' NOT NULL,
          reviewed_by text REFERENCES teachers(id) ON DELETE SET NULL,
          review_note text,
          reviewed_at integer,
          created_at integer DEFAULT (unixepoch()) NOT NULL,
          updated_at integer DEFAULT (unixepoch()) NOT NULL,
          CONSTRAINT chk_attendance_correction_requested_status CHECK(requested_status IN ('present', 'excused')),
          CONSTRAINT chk_attendance_correction_status CHECK(status IN ('pending', 'approved', 'rejected'))
        );
      `);
      await client.execute(`
        INSERT INTO attendance_correction_requests_new SELECT * FROM attendance_correction_requests;
      `);
      await client.execute("DROP TABLE attendance_correction_requests;");
      await client.execute("ALTER TABLE attendance_correction_requests_new RENAME TO attendance_correction_requests;");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_attendance_correction_student ON attendance_correction_requests (student_id);");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_attendance_correction_attendance ON attendance_correction_requests (attendance_id);");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_attendance_correction_status ON attendance_correction_requests (status);");
      await client.execute("PRAGMA foreign_keys = ON;");
      console.log("✅ attendance_correction_requests foreign key migrated to daily_attendance.");
    } else {
      console.log("ℹ️ attendance_correction_requests foreign key already points to daily_attendance.");
    }
  } catch (err) {
    console.error("⚠️ Failed to check/migrate attendance_correction_requests foreign key:", err);
  }

  // 8. Verify counts
  const studentsCount = await client.execute("SELECT COUNT(*) as total, COUNT(user_id) as linked FROM students");
  console.log("📊 Students Migration Status:", studentsCount.rows[0]);

  const teachersCount = await client.execute("SELECT COUNT(*) as total, COUNT(user_id) as linked FROM teachers");
  console.log("📊 Teachers Migration Status:", teachersCount.rows[0]);

  const allTables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("📋 All Turso tables:", allTables.rows.map(r => r.name));

  console.log("🎉 Production Turso migration successful!");
}

main().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
