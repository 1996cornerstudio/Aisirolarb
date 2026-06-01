import type {
  AttendanceRecord,
  AttendanceFilters,
  AppSettings,
  Profile,
} from "./types";

// --- Business rules -------------------------------------------------------
// A standard day is N net working hours (default 9). The clocked span also
// includes an unpaid break (default 1h) that does NOT count as work. Anything
// worked beyond the standard (after removing the break) is Overtime (OT).
//
// These values are now configurable in the Admin Settings page: there is a
// global default (app_settings) plus optional per-employee overrides.
export const BREAK_HOURS = 1;
export const STANDARD_HOURS = 9;
const MS_PER_HOUR = 1000 * 60 * 60;

/** The subset of settings that affects OT / shift calculations. */
export interface OtSettings {
  standardHours: number;
  breakHours: number;
  shiftStart: string; // "HH:MM" / "HH:MM:SS"
  shiftEnd: string;
  lateGraceMinutes: number;
}

export const DEFAULT_OT_SETTINGS: OtSettings = {
  standardHours: STANDARD_HOURS,
  breakHours: BREAK_HOURS,
  shiftStart: "09:00",
  shiftEnd: "18:00",
  lateGraceMinutes: 15,
};

/** Map a DB `app_settings` row to the runtime `OtSettings` shape. */
export function settingsFromRow(row: AppSettings | null): OtSettings {
  if (!row) return DEFAULT_OT_SETTINGS;
  return {
    standardHours: Number(row.standard_hours),
    breakHours: Number(row.break_hours),
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    lateGraceMinutes: row.late_grace_minutes,
  };
}

/**
 * Resolve the effective settings for one employee: any non-null override on
 * the profile wins, otherwise we fall back to the global default.
 */
export function resolveSettings(
  global: OtSettings,
  profile?: Partial<Profile> | null
): OtSettings {
  if (!profile) return global;
  return {
    standardHours:
      profile.standard_hours != null
        ? Number(profile.standard_hours)
        : global.standardHours,
    breakHours:
      profile.break_hours != null
        ? Number(profile.break_hours)
        : global.breakHours,
    shiftStart: profile.shift_start ?? global.shiftStart,
    shiftEnd: profile.shift_end ?? global.shiftEnd,
    lateGraceMinutes:
      profile.late_grace_minutes != null
        ? profile.late_grace_minutes
        : global.lateGraceMinutes,
  };
}

export interface WorkBreakdown {
  /** Raw clocked span (time_out - time_in) in hours. */
  grossHours: number;
  /** Net worked hours after removing the unpaid break. */
  netWorkHours: number;
  /** Regular (non-OT) hours, capped at the standard. */
  regularHours: number;
  /** Hours beyond the standard. */
  otHours: number;
  /** False when there is no time_out yet (still checked-in). */
  isComplete: boolean;
}

/** Calculate the work/OT breakdown for a single attendance record. */
export function calcWorkBreakdown(
  timeIn: string | null,
  timeOut: string | null,
  settings: OtSettings = DEFAULT_OT_SETTINGS
): WorkBreakdown {
  if (!timeIn || !timeOut) {
    return {
      grossHours: 0,
      netWorkHours: 0,
      regularHours: 0,
      otHours: 0,
      isComplete: false,
    };
  }

  const start = new Date(timeIn).getTime();
  const end = new Date(timeOut).getTime();
  const grossHours = Math.max(0, (end - start) / MS_PER_HOUR);

  const netWorkHours = Math.max(0, grossHours - settings.breakHours);
  const otHours = Math.max(0, netWorkHours - settings.standardHours);
  const regularHours = netWorkHours - otHours;

  return {
    grossHours,
    netWorkHours,
    regularHours,
    otHours,
    isComplete: true,
  };
}

/**
 * Was this check-in late versus the configured shift start (+ grace)?
 * Returns `false` when there is no time_in.
 */
export function isLateCheckIn(
  timeIn: string | null,
  settings: OtSettings = DEFAULT_OT_SETTINGS
): boolean {
  if (!timeIn) return false;
  const [h, m] = settings.shiftStart.split(":").map(Number);
  const d = new Date(timeIn);
  const shiftStart = new Date(d);
  shiftStart.setHours(h, m, 0, 0);
  const threshold = shiftStart.getTime() + settings.lateGraceMinutes * 60_000;
  return d.getTime() > threshold;
}

/** Round to one decimal place for display (e.g. 1.4163 -> 1.4). */
export function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatHours(value: number): string {
  return `${roundHours(value).toFixed(1)} h`;
}

export interface DashboardSummary {
  totalEmployees: number;
  totalBranches: number;
  totalRecords: number;
  totalWorkingHours: number;
  totalOtHours: number;
  activeCheckIns: number;
}

export function buildSummary(records: AttendanceRecord[]): DashboardSummary {
  const names = new Set<string>();
  const branches = new Set<string>();
  let totalWorkingHours = 0;
  let totalOtHours = 0;
  let activeCheckIns = 0;

  for (const r of records) {
    if (r.name) names.add(r.name);
    if (r.branch) branches.add(r.branch);

    const b = calcWorkBreakdown(r.time_in, r.time_out);
    totalWorkingHours += b.netWorkHours;
    totalOtHours += b.otHours;
    if (!r.time_out) activeCheckIns += 1;
  }

  return {
    totalEmployees: names.size,
    totalBranches: branches.size,
    totalRecords: records.length,
    totalWorkingHours,
    totalOtHours,
    activeCheckIns,
  };
}

/** Apply the dashboard filters to a list of records (client-side). */
export function applyFilters(
  records: AttendanceRecord[],
  filters: AttendanceFilters
): AttendanceRecord[] {
  const fromTs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toTs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  return records.filter((r) => {
    if (filters.branch && r.branch !== filters.branch) return false;
    if (filters.name && r.name !== filters.name) return false;

    const t = new Date(r.time_in).getTime();
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    return true;
  });
}

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
