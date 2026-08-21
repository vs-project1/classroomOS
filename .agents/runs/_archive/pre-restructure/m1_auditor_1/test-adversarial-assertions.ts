import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { users, studentProfiles } from "../../src/db/schema";
import crypto from "crypto";

async function assertRejects(fn: () => Promise<any>, description: string): Promise<void> {
  let didReject = false;
  try {
    await fn();
  } catch (error) {
    didReject = true;
  }
  if (!didReject) {
    throw new Error(`Constraint Failed (Did not reject): ${description}`);
  }
}

async function main() {
  const prefix = `adv_${crypto.randomUUID().slice(0, 8)}`;
  console.log("Testing whether valid insert throws when passed to assertRejects (Negative control)...");
  
  let caughtAssertionError = false;
  try {
    await assertRejects(
      () => db.insert(users).values({
        id: `${prefix}_valid_user`,
        email: `${prefix}_valid@classroom.os`,
        passwordHash: "valid_hash",
        role: "STUDENT",
      }),
      "Valid user should NOT reject"
    );
  } catch (e: any) {
    caughtAssertionError = true;
    console.log("✓ Correctly failed when valid data was expected to reject:", e.message);
  }

  if (!caughtAssertionError) {
    throw new Error("Adversarial check failed: assertRejects let a non-rejecting call pass!");
  }
}

main().catch(console.error);
