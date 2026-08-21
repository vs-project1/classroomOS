import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export class DatabaseTestHelper {
  private static getClient() {
    const url = process.env.DATABASE_URL || "file:local.db";
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    return createClient({ url, authToken });
  }

  /**
   * Restores clean database snapshot if running in local file SQLite mode.
   */
  static async restoreSnapshot() {
    const dbPath = path.resolve(process.cwd(), "local.db");
    const seedBackupPath = path.resolve(process.cwd(), "local.test-seed.db");

    if (fs.existsSync(seedBackupPath)) {
      fs.copyFileSync(seedBackupPath, dbPath);
    }
  }

  /**
   * Directly queries user record by email.
   */
  static async getUser(email: string) {
    const client = this.getClient();
    try {
      const rs = await client.execute({
        sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
      return rs.rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Directly queries assignment submission record.
   */
  static async getSubmission(homeworkId: string, studentId: string) {
    const client = this.getClient();
    try {
      const rs = await client.execute({
        sql: "SELECT * FROM assignment_submissions WHERE homework_id = ? AND student_id = ? LIMIT 1",
        args: [homeworkId, studentId],
      });
      return rs.rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Directly queries attendance correction request.
   */
  static async getCorrectionRequest(attendanceId: string, studentId: string) {
    const client = this.getClient();
    try {
      const rs = await client.execute({
        sql: "SELECT * FROM attendance_correction_requests WHERE attendance_id = ? AND student_id = ? LIMIT 1",
        args: [attendanceId, studentId],
      });
      return rs.rows[0] || null;
    } catch {
      return null;
    }
  }
}
