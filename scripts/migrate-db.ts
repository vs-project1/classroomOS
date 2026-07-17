import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL || "file:local.db",
  });

  console.log("Manually adding teachers table and teacher_id to subjects table...");

  try {
    // 1. Create teachers table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      );
    `);
    console.log("✓ Created teachers table (if not exists)");

    // 2. Add teacher_id to subjects table
    try {
      await client.execute(`
        ALTER TABLE subjects ADD COLUMN teacher_id TEXT REFERENCES teachers(id);
      `);
      console.log("✓ Added teacher_id column to subjects");
    } catch (e: any) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("column teacher_id already exists in subjects");
      } else {
        console.log("Note on subjects ALTER:", e.message);
      }
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.close();
  }
}

run();
