import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, AttendanceRecord } from "@/lib/types";
import { resolveSettings, settingsFromRow } from "@/lib/attendance";
import EmployeeDashboard from "./EmployeeDashboard";

export const metadata = {
  title: "My Attendance · Attendance & OT",
};

export default async function EmployeeDashboardPage() {
  const profile = await requireRole("employee");

  const supabase = createClient();
  const [recordsRes, settingsRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .order("time_in", { ascending: false }),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const settings = resolveSettings(
    settingsFromRow((settingsRes.data as AppSettings | null) ?? null),
    profile
  );

  return (
    <EmployeeDashboard
      profile={profile}
      initialRecords={(recordsRes.data as AttendanceRecord[]) ?? []}
      settings={settings}
    />
  );
}
