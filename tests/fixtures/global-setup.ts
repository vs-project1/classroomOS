import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import { seedE2E } from "../../scripts/seed-e2e";

export default async function globalSetup() {
  console.log("🛠️  [Global Setup] Initializing test database & seeding...");

  // Isolation guard (audit C8): tests must never run against a remote DB or
  // the developer's live local.db. Dedicated file DB unless explicitly overridden.
  const targetDbUrl = process.env.DATABASE_URL || "file:local.test.db";
  if (!targetDbUrl.startsWith("file:")) {
    console.error(
      `🛑 [Global Setup] REFUSING to run E2E against non-local DATABASE_URL: ${targetDbUrl}\n` +
        `   Tests mutate and reseed the database. Use a local file: URL.`
    );
    process.exit(1);
  }
  const dbPath = path.resolve(process.cwd(), targetDbUrl.replace(/^file:/, ""));
  const seedBackupPath = path.resolve(process.cwd(), "local.test-seed.db");

  console.log("ℹ️  [Global Setup] Using isolated SQLite test database:", targetDbUrl);

  const client = createClient({
    url: targetDbUrl,
    authToken: targetDbUrl.startsWith("file:") ? undefined : process.env.DATABASE_AUTH_TOKEN,
  });

  const db = drizzle(client);
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");

  console.log("📦 [Global Setup] Applying Drizzle migrations to", targetDbUrl);
  await migrate(db, { migrationsFolder });
  console.log("✓ [Global Setup] Database migrated successfully.");

  // Run comprehensive seeder
  console.log("🌱 [Global Setup] Seeding test database...");
  await seedE2E(client);

  // Create clean snapshot backup for instant file-level restoration if in local file mode
  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, seedBackupPath);
      console.log("💾 [Global Setup] Created clean database snapshot at local.test-seed.db");
    }
  } catch (e) {
    console.warn("Snapshot backup skipped:", e);
  }

  console.log("✅ [Global Setup] Test environment ready.");
}
