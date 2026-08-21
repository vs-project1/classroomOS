import { createClient } from "@libsql/client";
import { createSessionToken, getSessionTokenId } from "../../../../src/lib/auth/token";

const PERSONAS: Record<string, { userId: string; role: "ADMIN" | "STUDENT" }> = {
  admin: { userId: "usr_admin_001", role: "ADMIN" },
  student: { userId: "usr_student_001", role: "STUDENT" },
};

async function main() {
  const personaKey = process.argv[2];
  const persona = PERSONAS[personaKey];
  if (!persona) {
    console.error("usage: tsx mint-session.ts <admin|student>");
    process.exit(2);
  }

  const expiresAtMs = Date.now() + 60 * 60 * 1000; // 1 hour
  const token = createSessionToken({
    userId: persona.userId,
    role: persona.role,
    mustChangePassword: false,
    expiresAt: expiresAtMs,
  });
  const tokenId = getSessionTokenId(token);
  const expiresAtSec = Math.floor(expiresAtMs / 1000); // epoch SECONDS per schema timestamp mode

  const client = createClient({ url: "file:local.db" });
  await client.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, unixepoch())",
    args: [tokenId, persona.userId, expiresAtSec],
  });

  const check = await client.execute({
    sql: "SELECT id, user_id, expires_at FROM sessions WHERE id = ?",
    args: [tokenId],
  });
  client.close();

  console.log("PERSONA=" + personaKey + " USER=" + persona.userId + " ROLE=" + persona.role);
  console.log("SESSION_ROW=" + JSON.stringify(check.rows[0]));
  console.log("COOKIE=auth_session=" + token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
