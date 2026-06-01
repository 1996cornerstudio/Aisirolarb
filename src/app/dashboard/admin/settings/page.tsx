import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasAdminCredentials } from "@/lib/supabase/admin";
import type {
  AppSettings,
  AttendanceRecord,
  Branch,
  Profile,
} from "@/lib/types";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings · Attendance & OT",
};

export default async function SettingsPage() {
  const profile = await requireRole("admin");
  const supabase = createClient();

  const [profilesRes, settingsRes, branchesRes, attendanceRes] =
    await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("branches").select("*").order("name"),
      supabase
        .from("attendance")
        .select("*")
        .order("time_in", { ascending: false }),
    ]);

  return (
    <SettingsClient
      profile={profile}
      employees={(profilesRes.data as Profile[]) ?? []}
      settings={(settingsRes.data as AppSettings | null) ?? null}
      branches={(branchesRes.data as Branch[]) ?? []}
      records={(attendanceRes.data as AttendanceRecord[]) ?? []}
      serviceKeyReady={hasAdminCredentials()}
    />
  );
}
