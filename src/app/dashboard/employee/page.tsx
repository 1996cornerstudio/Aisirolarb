import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord } from "@/lib/types";
import EmployeeDashboard from "./EmployeeDashboard";

export const metadata = {
  title: "My Attendance · Attendance & OT",
};

export default async function EmployeeDashboardPage() {
  const profile = await requireRole("employee");

  const supabase = createClient();
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", profile.id)
    .order("time_in", { ascending: false });

  return (
    <EmployeeDashboard
      profile={profile}
      initialRecords={(data as AttendanceRecord[]) ?? []}
    />
  );
}
