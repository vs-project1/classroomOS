const { createClient } = require("@libsql/client");
(async () => {
  const client = createClient({ url: "file:local.test.db" });
  const r = await client.execute("SELECT id, name, roll_number, semester FROM students");
  console.log("STUDENTS:");
  r.rows.forEach(x => console.log("  ", x.id, "|", x.roll_number, "|", x.semester, "|", x.name));
  const p = await client.execute("SELECT id, semester FROM student_profiles");
  console.log("\nSTUDENT PROFILES:");
  p.rows.forEach(x => console.log("  ", x.id, "semester=", x.semester));
  const ds = await client.execute("SELECT * FROM daily_sessions");
  console.log("\nDAILY SESSIONS (post-test):");
  ds.rows.forEach(x => console.log("  ", x.id, "date=", x.date, "semester=", x.semester, "markedBy=", x.marked_by));
  const da = await client.execute("SELECT * FROM daily_attendance");
  console.log("\nDAILY ATTENDANCE (post-test):");
  da.rows.forEach(x => console.log("  ", x.id, "session=", x.daily_session_id, "student=", x.student_id, "status=", x.status));
  client.close();
})();
