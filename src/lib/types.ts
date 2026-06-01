export type Role = "employee" | "admin";

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  branch: string | null;
  role: Role;
  language: "en" | "th" | "my";
  /** Per-employee overrides. `null` means "use the global default". */
  standard_hours: number | null;
  break_hours: number | null;
  shift_start: string | null; // "HH:MM" / "HH:MM:SS"
  shift_end: string | null;
  late_grace_minutes: number | null;
  created_at: string;
  updated_at: string;
}

/** Global OT / shift defaults (single row, id = 1). */
export interface AppSettings {
  id: number;
  standard_hours: number;
  break_hours: number;
  shift_start: string; // "HH:MM:SS"
  shift_end: string;
  late_grace_minutes: number;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  branch: string;
  name: string;
  user_id: string | null;
  time_in: string; // ISO timestamp
  photo_in: string | null;
  time_out: string | null; // ISO timestamp, null while checked-in
  photo_out: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilters {
  branch: string; // "" = all
  name: string; // "" = all
  dateFrom: string; // yyyy-mm-dd, "" = no lower bound
  dateTo: string; // yyyy-mm-dd, "" = no upper bound
}
