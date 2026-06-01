import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, AttendanceRecord, Profile } from "@/lib/types";
import AdminDashboard from "./AdminDashboard";

export const metadata = {
  title: "Admin · Attendance & OT",
};

export default async function AdminDashboardPage() {
  const profile = await requireRole("admin");

  const supabase = createClient();
  const [recordsRes, settingsRes, profilesRes] = await Promise.all([
    supabase.from("attendance").select("*").order("time_in", { ascending: false }),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("*"),
  ]);

  return (
    <AdminDashboard
      profile={profile}
      initialRecords={(recordsRes.data as AttendanceRecord[]) ?? []}
      settings={(settingsRes.data as AppSettings | null) ?? null}
      employees={(profilesRes.data as Profile[]) ?? []}
    />
  );
}
