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
      semester integer DEFAULT 1 NOT NULL UNIQUE,
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
      semester integer DEFAULT 1 NOT NULL,
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
    await client.execute("ALTER TABLE students ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE RESTRICT");
    console.log("✅ Added user_id to students.");
  } else {
    console.log("ℹ️ students.user_id already exists.");
  }

  if (!studentCols.includes("section")) {
    console.log("➕ Adding column 'section' to students table...");
    await client.execute("ALTER TABLE students ADD COLUMN section TEXT DEFAULT 'A' NOT NULL");
    console.log("✅ Added section to students.");
  }

  if (!studentCols.includes("batch_year")) {
    console.log("➕ Adding column 'batch_year' to students table...");
    await client.execute("ALTER TABLE students ADD COLUMN batch_year INTEGER");
    console.log("✅ Added batch_year to students.");
  }

  if (!studentCols.includes("updated_at")) {
    console.log("➕ Adding column 'updated_at' to students table...");
    await client.execute("ALTER TABLE students ADD COLUMN updated_at INTEGER DEFAULT 0 NOT NULL");
    await client.execute("UPDATE students SET updated_at = unixepoch() WHERE updated_at = 0");
    console.log("✅ Added updated_at to students.");
  }

  // Check if student_profiles exists and backfill into students
  const tablesInfo = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  const tableNames = tablesInfo.rows.map((r) => r.name as string);

  if (tableNames.includes("student_profiles")) {
    console.log("🔄 Merging student_profiles into students...");
    await client.execute(`
      UPDATE students
      SET
        section = COALESCE((
          SELECT section FROM student_profiles
          WHERE student_profiles.user_id = students.user_id
             OR student_profiles.roll_number = students.roll_number
          LIMIT 1
        ), students.section, 'A'),
        batch_year = COALESCE((
          SELECT batch_year FROM student_profiles
          WHERE student_profiles.user_id = students.user_id
             OR student_profiles.roll_number = students.roll_number
          LIMIT 1
        ), students.batch_year, 2024)
    `);
    await client.execute("DROP TABLE IF EXISTS student_profiles");
    console.log("✅ student_profiles merged and dropped.");
  }

  // 4a. Check students table definition and recreate if missing full constraints
  const studentsSqlRow = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'");
  const studentsSql = (studentsSqlRow.rows[0]?.sql as string) || "";
  if (!studentsSql.includes("chk_students_semester") || !studentsSql.includes("ON DELETE RESTRICT")) {
    console.log("🔄 Recreating students table with full constraints (CHECK semester BETWEEN 1 AND 8, UNIQUE user_id, ON DELETE RESTRICT)...");
    await client.execute("PRAGMA foreign_keys = OFF;");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS students_new (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        name text NOT NULL,
        roll_number text NOT NULL UNIQUE,
        email text UNIQUE,
        phone text,
        faculty text DEFAULT 'BCA' NOT NULL,
        semester integer NOT NULL,
        section text DEFAULT 'A' NOT NULL,
        batch_year integer DEFAULT 2025 NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        CONSTRAINT chk_students_semester CHECK (semester BETWEEN 1 AND 8)
      );
    `);
    await client.execute(`
      INSERT INTO students_new (
        id, user_id, name, roll_number, email, phone, faculty, semester, section, batch_year, created_at, updated_at
      )
      SELECT
        id,
        user_id,
        name,
        roll_number,
        email,
        phone,
        COALESCE(faculty, 'BCA'),
        CAST(semester AS INTEGER),
        COALESCE(section, 'A'),
        COALESCE(batch_year, 2024),
        COALESCE(created_at, unixepoch()),
        COALESCE(updated_at, unixepoch())
      FROM students;
    `);
    await client.execute("DROP TABLE students;");
    await client.execute("ALTER TABLE students_new RENAME TO students;");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_students_faculty_semester_section ON students (faculty, semester, section);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);");
    await client.execute("PRAGMA foreign_keys = ON;");
    console.log("✅ students table recreated with unified schema and full constraints.");
  }

  // 4b. Recreate weekly_routine if missing teacher_id or slot_type
  const routineInfo = await client.execute("PRAGMA table_info(weekly_routine)");
  const routineCols = routineInfo.rows.map((r) => r.name as string);
  if (!routineCols.includes("teacher_id") || !routineCols.includes("slot_type")) {
    console.log("🔄 Recreating weekly_routine with teacher_id, slot_type, custom_title, section...");
    await client.execute("PRAGMA foreign_keys = OFF;");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS weekly_routine_new (
        id text PRIMARY KEY NOT NULL,
        subject_id text REFERENCES subjects(id) ON DELETE CASCADE,
        slot_type text DEFAULT 'LECTURE' NOT NULL,
        custom_title text,
        section text DEFAULT 'A' NOT NULL,
        day_of_week integer NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        teacher_id text REFERENCES teachers(id) ON DELETE SET NULL,
        room text,
        notes text,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        CONSTRAINT chk_weekly_routine_slot_type CHECK(slot_type IN ('LECTURE', 'LAB', 'TUTORIAL', 'BREAK', 'ECA', 'EVENT', 'OTHER')),
        CONSTRAINT chk_weekly_routine_day CHECK(day_of_week BETWEEN 0 AND 6),
        CONSTRAINT chk_weekly_routine_time CHECK(start_time < end_time)
      );
    `);
    if (routineCols.includes("teacher_name")) {
      await client.execute(`
        INSERT INTO weekly_routine_new (id, subject_id, slot_type, custom_title, section, day_of_week, start_time, end_time, teacher_id, room, notes, created_at, updated_at)
        SELECT
          id,
          subject_id,
          'LECTURE',
          NULL,
          'A',
          day_of_week,
          start_time,
          end_time,
          (SELECT id FROM teachers WHERE teachers.name = weekly_routine.teacher_name LIMIT 1),
          room,
          notes,
          created_at,
          updated_at
        FROM weekly_routine;
      `);
    } else {
      await client.execute(`
        INSERT INTO weekly_routine_new (id, subject_id, slot_type, custom_title, section, day_of_week, start_time, end_time, teacher_id, room, notes, created_at, updated_at)
        SELECT id, subject_id, 'LECTURE', NULL, 'A', day_of_week, start_time, end_time, NULL, room, notes, created_at, updated_at
        FROM weekly_routine;
      `);
    }
    await client.execute("DROP TABLE weekly_routine;");
    await client.execute("ALTER TABLE weekly_routine_new RENAME TO weekly_routine;");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_day_time ON weekly_routine (day_of_week, start_time);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_subject ON weekly_routine (subject_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_teacher ON weekly_routine (teacher_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_section ON weekly_routine (section);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_day_sem_sec ON weekly_routine (day_of_week, section);");
    await client.execute("PRAGMA foreign_keys = ON;");
    console.log("✅ weekly_routine table recreated with unified schema.");
  }

  // 4b-2. Check weekly_routine semester column
  const currentRoutineInfo = await client.execute("PRAGMA table_info(weekly_routine)");
  const currentRoutineCols = currentRoutineInfo.rows.map((r) => r.name as string);
  if (!currentRoutineCols.includes("semester")) {
    console.log("➕ Adding column 'semester' to weekly_routine...");
    await client.execute("ALTER TABLE weekly_routine ADD COLUMN semester TEXT DEFAULT 'I' NOT NULL");
    await client.execute(`
      UPDATE weekly_routine
      SET semester = COALESCE(
        (SELECT semester FROM subjects WHERE subjects.id = weekly_routine.subject_id),
        'I'
      )
      WHERE subject_id IS NOT NULL;
    `);
    console.log("✅ Added semester to weekly_routine and backfilled.");
  }
  await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_semester ON weekly_routine (semester);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_weekly_routine_sem_sec ON weekly_routine (semester, section);");

  // 4c. Check class_sessions columns (section) and unique slot index
  const csSqlRow = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='class_sessions'");
  const csSql = (csSqlRow.rows[0]?.sql as string) || "";
  if (csSql.includes("unq_class_session_subject_date")) {
    console.log("🔄 Recreating class_sessions table with unq_class_session_slot and section...");
    await client.execute("PRAGMA foreign_keys = OFF;");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS class_sessions_new (
        id text PRIMARY KEY NOT NULL,
        subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        routine_id text REFERENCES weekly_routine(id) ON DELETE SET NULL,
        session_date integer NOT NULL,
        section text DEFAULT 'A' NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        CONSTRAINT unq_class_session_slot UNIQUE(subject_id, session_date, section, start_time)
      );
    `);
    const oldCsCols = (await client.execute("PRAGMA table_info(class_sessions)")).rows.map((r) => r.name as string);
    const hasSectionCol = oldCsCols.includes("section");
    await client.execute(`
      INSERT INTO class_sessions_new (id, subject_id, routine_id, session_date, section, start_time, end_time, created_at)
      SELECT id, subject_id, routine_id, session_date, ${hasSectionCol ? "COALESCE(section, 'A')" : "'A'"}, start_time, end_time, created_at
      FROM class_sessions;
    `);
    await client.execute("DROP TABLE class_sessions;");
    await client.execute("ALTER TABLE class_sessions_new RENAME TO class_sessions;");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_subject_id ON class_sessions (subject_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_session_date ON class_sessions (session_date);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_routine_id ON class_sessions (routine_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_sec_date ON class_sessions (section, session_date);");
    await client.execute("PRAGMA foreign_keys = ON;");
    console.log("✅ class_sessions table recreated with composite slot constraint.");
  } else {
    const csInfo = await client.execute("PRAGMA table_info(class_sessions)");
    const csCols = csInfo.rows.map((r) => r.name as string);
    if (!csCols.includes("section")) {
      console.log("➕ Adding column 'section' to class_sessions...");
      await client.execute("ALTER TABLE class_sessions ADD COLUMN section TEXT DEFAULT 'A' NOT NULL");
      console.log("✅ Added section to class_sessions.");
    }
    await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_sec_date ON class_sessions (section, session_date);");
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS unq_class_session_slot ON class_sessions (subject_id, session_date, section, start_time);");
    await client.execute("DROP INDEX IF EXISTS unq_class_session_subject_date;");
  }

  // 4d. Check daily_sessions columns (section)
  const dsInfo = await client.execute("PRAGMA table_info(daily_sessions)");
  const dsCols = dsInfo.rows.map((r) => r.name as string);
  if (!dsCols.includes("section")) {
    console.log("➕ Adding column 'section' to daily_sessions...");
    await client.execute("ALTER TABLE daily_sessions ADD COLUMN section TEXT DEFAULT 'A' NOT NULL");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_sessions_semester_section ON daily_sessions (semester, section);");
    console.log("✅ Added section to daily_sessions.");
  }

  // 4d. Check notices and events columns (created_by_id)
  const noticesInfo = await client.execute("PRAGMA table_info(notices)");
  const noticesCols = noticesInfo.rows.map((r) => r.name as string);
  if (!noticesCols.includes("created_by_id")) {
    console.log("➕ Adding column 'created_by_id' to notices...");
    await client.execute("ALTER TABLE notices ADD COLUMN created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL");
    console.log("✅ Added created_by_id to notices.");
  }
  await client.execute("CREATE INDEX IF NOT EXISTS idx_notices_expires_pinned_created ON notices (expires_at, is_pinned, created_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_notices_created_by ON notices (created_by_id);");

  const eventsInfo = await client.execute("PRAGMA table_info(events)");
  const eventsCols = eventsInfo.rows.map((r) => r.name as string);
  if (!eventsCols.includes("created_by_id")) {
    console.log("➕ Adding column 'created_by_id' to events...");
    await client.execute("ALTER TABLE events ADD COLUMN created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL");
    console.log("✅ Added created_by_id to events.");
  }
  await client.execute("CREATE INDEX IF NOT EXISTS idx_events_date_type ON events (event_date, event_type);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_events_created_by ON events (created_by_id);");

  // 4e. Check semester_telegram_configs columns (section)
  const stcInfo = await client.execute("PRAGMA table_info(semester_telegram_configs)");
  const stcCols = stcInfo.rows.map((r) => r.name as string);
  if (!stcCols.includes("section")) {
    console.log("➕ Adding column 'section' to semester_telegram_configs...");
    await client.execute("ALTER TABLE semester_telegram_configs ADD COLUMN section TEXT DEFAULT 'A' NOT NULL");
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS unq_semester_telegram_configs_sem_sec ON semester_telegram_configs (semester, section);");
    console.log("✅ Added section to semester_telegram_configs.");
  }

  // 4f. Drop deprecated tables if they still exist
  await client.execute("DROP TABLE IF EXISTS course_materials;");
  await client.execute("DROP TABLE IF EXISTS attendance;");

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

  // 5a. Check subjects columns (is_active)
  const subjectsInfo = await client.execute("PRAGMA table_info(subjects)");
  const subjectsCols = subjectsInfo.rows.map((r) => r.name as string);
  if (!subjectsCols.includes("is_active")) {
    console.log("➕ Adding column 'is_active' to subjects table...");
    await client.execute("ALTER TABLE subjects ADD COLUMN is_active INTEGER DEFAULT 1 NOT NULL");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON subjects (is_active);");
    console.log("✅ Added is_active to subjects.");
  }

  // 5b. Check resources columns and foreign keys (uploaded_by must reference users, chapter/unit must SET NULL)
  const resourcesFks = await client.execute("PRAGMA foreign_key_list(resources)");
  const uploadedByFk = resourcesFks.rows.find((r) => r.from === "uploaded_by");
  const chapterFk = resourcesFks.rows.find((r) => r.from === "chapter_id");
  const unitFk = resourcesFks.rows.find((r) => r.from === "unit_id");
  const resourcesInfo = await client.execute("PRAGMA table_info(resources)");
  const resourcesCols = resourcesInfo.rows.map((r) => r.name as string);

  if (
    (uploadedByFk && uploadedByFk.table === "teachers") || 
    !resourcesCols.includes("unit_id") ||
    (chapterFk && chapterFk.on_delete !== "SET NULL") ||
    (unitFk && unitFk.on_delete !== "SET NULL")
  ) {
    console.log("🔄 Recreating resources table with unit_id, chapter_id (SET NULL), and uploaded_by referencing users(id)...");
    await client.execute("PRAGMA foreign_keys = OFF;");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS resources_new (
        id text PRIMARY KEY NOT NULL,
        subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        unit_id text REFERENCES course_units(id) ON DELETE SET NULL,
        chapter_id text REFERENCES course_chapters(id) ON DELETE SET NULL,
        title text NOT NULL,
        description text,
        file_url text NOT NULL,
        file_type text NOT NULL,
        file_size integer,
        uploaded_by text REFERENCES users(id) ON DELETE SET NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL
      );
    `);
    await client.execute(`
      INSERT INTO resources_new (
        id, subject_id, unit_id, chapter_id, title, description, file_url, file_type, file_size, uploaded_by, created_at, updated_at
      )
      SELECT
        r.id,
        r.subject_id,
        ${resourcesCols.includes("unit_id") ? "r.unit_id" : "NULL"},
        r.chapter_id,
        r.title,
        r.description,
        r.file_url,
        r.file_type,
        r.file_size,
        COALESCE(u.id, r.uploaded_by),
        r.created_at,
        r.updated_at
      FROM resources r
      LEFT JOIN teachers t ON r.uploaded_by = t.id
      LEFT JOIN users u ON t.user_id = u.id;
    `);
    await client.execute("DROP TABLE resources;");
    await client.execute("ALTER TABLE resources_new RENAME TO resources;");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources (subject_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_resources_unit ON resources (unit_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_resources_chapter ON resources (chapter_id);");
    await client.execute("PRAGMA foreign_keys = ON;");
    console.log("✅ resources table recreated with uploaded_by referencing users(id) and full constraints.");
  } else {
    console.log("ℹ️ resources table schema & FKs already synchronized.");
  }

  // 6. Backfill user_ids
  console.log("🔄 Backfilling user_id mappings...");
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

  // 7b. Create missing performance indexes
  console.log("⚡ Ensuring performance indexes exist...");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers (user_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects (semester);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON subjects (teacher_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_students_semester ON students (semester);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_students_faculty_semester ON students (faculty, semester);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_class_sessions_routine_id ON class_sessions (routine_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_attendance_correction_status_created ON attendance_correction_requests (status, created_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_sessions_semester_date ON daily_sessions (semester, date);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_sessions_marked_by ON daily_sessions (marked_by);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_id ON daily_attendance (student_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_status ON daily_attendance (student_id, status);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions (graded_by);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_resources_unit ON resources (unit_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_study_tasks_subject ON study_tasks (subject_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_attendance_correction_reviewed_by ON attendance_correction_requests (reviewed_by);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_logs_sent_by ON telegram_broadcast_logs (sent_by_user_id);");
  await client.execute("DROP INDEX IF EXISTS idx_subject_grade_weights_subject;");
  console.log("✅ All performance indexes verified.");

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
