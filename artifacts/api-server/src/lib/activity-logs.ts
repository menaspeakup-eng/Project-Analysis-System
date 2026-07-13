import { db, activityLogsTable, type InsertActivityLog } from "@workspace/db";

export async function logActivity(studentId: number, log: Omit<InsertActivityLog, "studentId">) {
  try {
    await db.insert(activityLogsTable).values({ ...log, studentId });
  } catch {
    // Silent: activity logging should not break the main flow.
  }
}
