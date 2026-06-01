import { createClient } from "./supabase/client";
import type { AttendanceRecord } from "./types";

/**
 * Shared browser Supabase client. Backed by `@supabase/ssr` so the auth session
 * is read from / written to cookies and stays in sync with the server.
 */
export const supabase = createClient();

export const ATTENDANCE_BUCKET = "attendance-photos";

export interface FetchAttendanceResult {
  data: AttendanceRecord[];
  error: string | null;
}

/**
 * Fetch all rows from the `attendance` table, newest first (by check-in time).
 * On failure it logs the error to the console and returns it as a string so the
 * UI can show a friendly message.
 */
export async function fetchAttendanceRecords(): Promise<FetchAttendanceResult> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .order("time_in", { ascending: false });

  if (error) {
    console.error("[attendance] Failed to fetch records:", error.message, error);
    return { data: [], error: error.message };
  }

  return { data: (data as AttendanceRecord[]) ?? [], error: null };
}
