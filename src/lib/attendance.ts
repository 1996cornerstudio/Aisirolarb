import type { AttendanceRecord, AttendanceFilters } from "./types";

// --- Business rules -------------------------------------------------------
// A standard day is 9 net working hours. The clocked span also includes a
// 1-hour unpaid break that does NOT count as work. Anything worked beyond the
// 9-hour standard (after removing the break) is Overtime (OT).
//
// Example from the reference data:
//   time_in  = 09:45:01
//   time_out = 21:10:00
//   gross span        = ~11.42 h
//   net work (-break) = ~10.42 h
//   OT (net - 9)      = ~1.42 h  -> ~1.4 h
export const BREAK_HOURS = 1;
export const STANDARD_HOURS = 9;
const MS_PER_HOUR = 1000 * 60 * 60;

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
  timeOut: string | null
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

  const netWorkHours = Math.max(0, grossHours - BREAK_HOURS);
  const otHours = Math.max(0, netWorkHours - STANDARD_HOURS);
  const regularHours = netWorkHours - otHours;

  return {
    grossHours,
    netWorkHours,
    regularHours,
    otHours,
    isComplete: true,
  };
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
