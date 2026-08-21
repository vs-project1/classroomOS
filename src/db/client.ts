import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "../env";
import * as schema from "./schema";

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

// Enforce referential integrity at the DB level (audit finding).
// Queued as the first statement on this client, so it executes before any
// subsequent query. Remote/Turso drivers may reject PRAGMAs — logged, not fatal.
client.execute("PRAGMA foreign_keys = ON;").catch((error) => {
  console.error("Failed to enable PRAGMA foreign_keys:", error);
});

export const db = drizzle(client, { schema });
