const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
  });

  const admin = await client.execute("SELECT email FROM users WHERE role = 'ADMIN' LIMIT 1;");
  console.log('ADMIN:', admin.rows);

  const teacher = await client.execute("SELECT email FROM users WHERE role = 'TEACHER' LIMIT 1;");
  console.log('TEACHER:', teacher.rows);

  const cr = await client.execute("SELECT u.email, sp.semester FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE u.role = 'CR' LIMIT 1;");
  console.log('CR:', cr.rows);

  const sem2 = await client.execute("SELECT u.email, sp.semester FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE sp.semester = 2 LIMIT 1;");
  console.log('SEM 2 STUDENT:', sem2.rows);

  process.exit(0);
}

run();
