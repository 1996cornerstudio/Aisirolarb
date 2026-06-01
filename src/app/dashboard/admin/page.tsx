import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord } from "@/lib/types";
import AdminDashboard from "./AdminDashboard";

export const metadata = {
  title: "Admin · Attendance & OT",
};

export default async function AdminDashboardPage() {
  const profile = await requireRole("admin");

  const supabase = createClient();
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .order("time_in", { ascending: false });

  return (
    <AdminDashboard
      profile={profile}
      initialRecords={(data as AttendanceRecord[]) ?? []}
    />
  );
}
