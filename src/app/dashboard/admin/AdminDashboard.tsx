"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Pencil,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AppSettings, AttendanceRecord, Profile } from "@/lib/types";
import {
  calcWorkBreakdown,
  formatDateTime,
  resolveSettings,
  settingsFromRow,
  roundHours,
  uniqueSorted,
  type OtSettings,
} from "@/lib/attendance";
import LogoutButton from "@/components/LogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  profile: Profile;
  initialRecords: AttendanceRecord[];
  settings: AppSettings | null;
  employees: Profile[];
}

const HIGH_OT_HOURS = 3;

export default function AdminDashboard({
  profile,
  initialRecords,
  settings,
  employees,
}: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const globalSettings = useMemo(() => settingsFromRow(settings), [settings]);
  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  /** Effective OT settings for a record's owner (override → global). */
  function settingsFor(rec: AttendanceRecord): OtSettings {
    return resolveSettings(
      globalSettings,
      rec.user_id ? employeeById.get(rec.user_id) : null
    );
  }

  const branches = useMemo(
    () => uniqueSorted(records.map((r) => r.branch)),
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (branch && r.branch !== branch) return false;
      if (date && new Date(r.time_in).toDateString() !== new Date(date).toDateString())
        return false;
      return true;
    });
  }, [records, search, branch, date]);

  const stats = useMemo(() => {
    const activeNow = records.filter((r) => !r.time_out);
    const activeBranches = new Set(activeNow.map((r) => r.branch));
    let totalOt = 0;
    const names = new Set<string>();
    for (const r of records) {
      names.add(r.name);
      totalOt += calcWorkBreakdown(r.time_in, r.time_out, settingsFor(r)).otHours;
    }
    return {
      currentlyIn: activeNow.length,
      activeBranches: activeBranches.size,
      totalOt,
      totalEmployees: names.size,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, globalSettings, employeeById]);

  async function refresh() {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("time_in", { ascending: false });
    if (data) setRecords(data as AttendanceRecord[]);
  }

  async function saveEdit(
    id: number,
    patch: { remark: string; time_in: string; time_out: string | null }
  ) {
    const { error } = await supabase
      .from("attendance")
      .update({
        remark: patch.remark.trim() || null,
        time_in: patch.time_in,
        time_out: patch.time_out,
      })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  }

  const hasFilter = search || branch || date;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t.admin.title}
              </h1>
              <p className="text-sm text-slate-500">{t.admin.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {profile.name}
            </span>
            <Link
              href="/dashboard/admin/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <SettingsIcon size={16} />
              {t.admin.settingsBtn}
            </Link>
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </header>

        {/* Summary cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t.admin.cardCurrentlyIn}
            hint={t.admin.cardCurrentlyInHint}
            value={String(stats.currentlyIn)}
            accent="from-emerald-500 to-emerald-600"
            icon={<UserCheck size={22} />}
          />
          <SummaryCard
            label={t.admin.cardActiveBranches}
            hint={t.admin.cardActiveBranchesHint}
            value={String(stats.activeBranches)}
            accent="from-brand-500 to-brand-600"
            icon={<Building2 size={22} />}
          />
          <SummaryCard
            label={t.admin.cardTotalOt}
            hint={t.admin.cardTotalOtHint}
            value={`${roundHours(stats.totalOt).toLocaleString("en-US", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} ${t.common.hoursShort}`}
            accent="from-amber-500 to-orange-600"
            icon={<Zap size={22} />}
          />
          <SummaryCard
            label={t.admin.cardTotalEmp}
            hint={t.admin.cardTotalEmpHint}
            value={String(stats.totalEmployees)}
            accent="from-violet-500 to-violet-600"
            icon={<UserCheck size={22} />}
          />
        </section>

        {/* Master table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {t.admin.masterTitle}{" "}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {filtered.length}
              </span>
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={15} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.admin.searchPlaceholder}
                  className="w-40 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Branch — styled like the language switcher */}
              <div className="relative inline-flex items-center">
                <Building2
                  size={15}
                  className="pointer-events-none absolute left-2.5 text-slate-400"
                />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="h-10 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">{t.admin.allBranches}</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 text-slate-400"
                />
              </div>

              {/* Date — calendar icon + whole-field click to open the picker */}
              <div className="relative inline-flex items-center">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute left-2.5 z-10 text-slate-400"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
              </div>
              {hasFilter && (
                <button
                  onClick={() => {
                    setSearch("");
                    setBranch("");
                    setDate("");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <X size={14} /> {t.common.clear}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t.admin.colEmployee}</th>
                  <th className="px-4 py-3 font-medium">{t.admin.colBranch}</th>
                  <th className="px-4 py-3 font-medium">{t.admin.colTimeIn}</th>
                  <th className="px-4 py-3 font-medium">{t.admin.colTimeOut}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t.admin.colWork}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t.admin.colOt}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    {t.admin.colPhotos}
                  </th>
                  <th className="px-4 py-3 font-medium">{t.admin.colRemark}</th>
                  <th className="px-4 py-3 text-center font-medium">
                    {t.admin.colEdit}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      {t.admin.noRecords}
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const b = calcWorkBreakdown(r.time_in, r.time_out, settingsFor(r));
                  const highOt = b.otHours >= HIGH_OT_HOURS;
                  const hasRemark = !!r.remark?.trim();
                  const rowTint = highOt
                    ? "bg-amber-50/70 hover:bg-amber-100/60"
                    : hasRemark
                    ? "bg-rose-50/60 hover:bg-rose-100/50"
                    : "hover:bg-slate-50";
                  return (
                    <tr key={r.id} className={rowTint}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                            {initials(r.name)}
                          </span>
                          {r.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {r.branch}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(r.time_in)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(r.time_out)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {b.isComplete ? roundHours(b.netWorkHours).toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {b.isComplete && b.otHours > 0 ? (
                          <span
                            className={`font-semibold ${
                              highOt ? "text-amber-700" : "text-amber-600"
                            }`}
                          >
                            {roundHours(b.otHours).toFixed(1)}
                          </span>
                        ) : b.isComplete ? (
                          <span className="text-slate-400">0.0</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <PhotoThumb url={r.photo_in} label="IN" onOpen={setPreview} />
                          <PhotoThumb url={r.photo_out} label="OUT" onOpen={setPreview} />
                        </div>
                      </td>
                      <td className="max-w-[14rem] px-4 py-3">
                        {hasRemark ? (
                          <span className="text-xs text-rose-700">{r.remark}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setEditing(r)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                          aria-label="Edit record"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Attendance"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  hint,
  value,
  accent,
  icon,
}: {
  label: string;
  hint: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function PhotoThumb({
  url,
  label,
  onOpen,
}: {
  url: string | null;
  label: string;
  onOpen: (url: string) => void;
}) {
  if (!url || url === "null") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-300">
        {label}
      </span>
    );
  }
  return (
    <button
      onClick={() => onOpen(url)}
      className="group relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200"
      title={`View ${label} photo`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`${label} photo`} className="h-full w-full object-cover" />
      {/* Hover preview */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 group-hover:block">
        <span className="block overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${label} preview`}
            className="h-40 w-40 rounded-lg object-cover"
          />
          <span className="mt-1 block text-center text-[10px] font-medium text-slate-500">
            PHOTO {label}
          </span>
        </span>
      </span>
    </button>
  );
}

function EditModal({
  record,
  onClose,
  onSave,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSave: (
    id: number,
    patch: { remark: string; time_in: string; time_out: string | null }
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const [remark, setRemark] = useState(record.remark ?? "");
  const [timeIn, setTimeIn] = useState(toLocalInput(record.time_in));
  const [timeOut, setTimeOut] = useState(toLocalInput(record.time_out));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(record.id, {
        remark,
        time_in: new Date(timeIn).toISOString(),
        time_out: timeOut ? new Date(timeOut).toISOString() : null,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : t.admin.editError
      );
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {t.admin.editTitle}
            </h3>
            <p className="text-sm text-slate-500">
              {record.name} · {record.branch}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t.admin.editTimeIn}</label>
              <input
                type="datetime-local"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t.admin.editTimeOut}</label>
              <input
                type="datetime-local"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t.admin.editRemark}</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder={t.admin.remarkPlaceholder}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[1.4] rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? t.admin.saving : t.admin.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ISO → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
