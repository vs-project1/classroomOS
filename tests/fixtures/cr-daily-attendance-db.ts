import { createClient } from "@libsql/client";

/**
 * Direct-DB helpers for the CR daily-attendance flow.
 *
 * Used by tests that need to prove the server action actually wrote the
 * expected rows — UI assertions alone are not enough because the action
 * could "succeed" while writing nothing.
 *
 * Connects to the same DATABASE_URL the dev server is using. Global setup
 * fails fast if that's not a `file:` URL, so this client never touches a
 * remote DB.
 */
export class CRDailyAttendanceDb {
  private static getClient() {
    const url = process.env.DATABASE_URL || "file:local.test.db";
    return createClient({ url });
  }

  static async getDailySessionForDate(semester: string, dateEpochSeconds: number) {
    const client = this.getClient();
    try {
      const rs = await client.execute({
        sql: `SELECT * FROM daily_sessions
              WHERE semester = ? AND date = ?
              LIMIT 1`,
        args: [semester, dateEpochSeconds],
      });
      return rs.rows[0] || null;
    } finally {
      client.close();
    }
  }

  static async getDailyAttendanceForSession(sessionId: string) {
    const client = this.getClient();
    try {
      const rs = await client.execute({
        sql: `SELECT * FROM daily_attendance
              WHERE daily_session_id = ?
              ORDER BY student_id ASC`,
        args: [sessionId],
      });
      return rs.rows;
    } finally {
      client.close();
    }
  }

  static async deleteDailySessionCascade(sessionId: string) {
    // Test cleanup: removing the session cascades to daily_attendance.
    const client = this.getClient();
    try {
      await client.execute({
        sql: `DELETE FROM daily_sessions WHERE id = ?`,
        args: [sessionId],
      });
    } finally {
      client.close();
    }
  }
}
