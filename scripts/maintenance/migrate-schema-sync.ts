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
      message_text text NOT NULL,
      status text NOT NULL,
      error_message text,
      sent_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_created ON telegram_broadcast_logs (created_at);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_semester ON telegram_broadcast_logs (semester);`);
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
  console.log("✅ user_id backfill complete.");

  // 7. Verify counts
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
