export type Role = "employee" | "admin";

export interface Profile {
  id: string;
  name: string;
  branch: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
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
