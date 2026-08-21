import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:local.db" });

  const admins = await client.execute(
    "SELECT id, email, role, is_active, must_change_password FROM users WHERE role = 'ADMIN' LIMIT 5"
  );
  console.log("ADMINS:", JSON.stringify(admins.rows));

  const students = await client.execute(
    "SELECT id, email, role, is_active, must_change_password FROM users WHERE role IN ('STUDENT','CR') AND is_active = 1 LIMIT 8"
  );
  console.log("STUDENTS/CR:", JSON.stringify(students.rows));

  const target = await client.execute(
    "SELECT id, email, role, is_active, must_change_password FROM users WHERE id = 'usr_admin_01'"
  );
  console.log("usr_admin_01:", JSON.stringify(target.rows));

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
