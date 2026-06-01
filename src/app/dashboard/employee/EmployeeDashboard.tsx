"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CalendarDays,
  Clock3,
  History,
  LogIn,
  LogOut,
  TimerReset,
  Zap,
} from "lucide-react";
import { supabase, ATTENDANCE_BUCKET } from "@/lib/supabaseClient";
import type { AttendanceRecord, Profile } from "@/lib/types";
import { calcWorkBreakdown, roundHours, type OtSettings } from "@/lib/attendance";
import CameraCapture from "@/components/CameraCapture";
import ChangePasswordButton from "@/components/ChangePasswordButton";
import { signOutAction } from "@/app/auth/actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  profile: Profile;
  initialRecords: AttendanceRecord[];
  settings: OtSettings;
}

type Tab = "clock" | "history";

export default function EmployeeDashboard({
  profile,
  initialRecords,
  settings,
}: Props) {
  const { t, intlLocale } = useI18n();
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [tab, setTab] = useState<Tab>("clock");
  const [now, setNow] = useState<Date | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | {
    mode: "in" | "out";
    record: AttendanceRecord;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeRecord = useMemo(
    () => records.find((r) => !r.time_out) ?? null,
    [records]
  );
  const mode: "in" | "out" = activeRecord ? "out" : "in";

  async function refresh() {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .order("time_in", { ascending: false });
    if (data) setRecords(data as AttendanceRecord[]);
  }

  async function uploadPhoto(file: File, kind: "in" | "out") {
    const ext = file.name.split(".").pop() || "jpg";
    const safe = profile.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const path = `attendance/${safe}_${Date.now()}_${kind}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(ATTENDANCE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    return supabase.storage.from(ATTENDANCE_BUCKET).getPublicUrl(path).data
      .publicUrl;
  }

  async function handleConfirm(file: File) {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "in") {
        const photo = await uploadPhoto(file, "in");
        const { data, error: insErr } = await supabase
          .from("attendance")
          .insert({
            name: profile.name,
            branch: profile.branch ?? "",
            user_id: profile.id,
            time_in: new Date().toISOString(),
            photo_in: photo,
          })
          .select("*")
          .single();
        if (insErr) throw insErr;
        setSuccess({ mode: "in", record: data as AttendanceRecord });
      } else if (activeRecord) {
        const photo = await uploadPhoto(file, "out");
        const { data, error: updErr } = await supabase
          .from("attendance")
          .update({ time_out: new Date().toISOString(), photo_out: photo })
          .eq("id", activeRecord.id)
          .select("*")
          .single();
        if (updErr) throw updErr;
        setSuccess({ mode: "out", record: data as AttendanceRecord });
      }
      setCameraOpen(false);
      await refresh();
    } catch (err: unknown) {
      setError(errMsg(err, t.employee.error));
      setCameraOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 pb-8 pt-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-brand-100">
              {now
                ? now.toLocaleDateString(intlLocale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    numberingSystem: "latn",
                  })
                : "—"}
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-tight tabular-nums">
              {now
                ? now.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                : "--:--:--"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher tone="dark" />
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label={t.common.signOut}
                className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-base font-bold">
            {initials(profile.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            <p className="truncate text-xs text-brand-100">
              {profile.branch ?? t.common.noBranch}
            </p>
          </div>
          <ChangePasswordButton className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25" />
        </div>
      </header>

      <main className="px-5">
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {tab === "clock" ? (
          <ClockView
            mode={mode}
            activeRecord={activeRecord}
            onAction={() => {
              setError(null);
              setCameraOpen(true);
            }}
            todayRecords={records}
            settings={settings}
          />
        ) : (
          <HistoryView records={records} settings={settings} />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="grid grid-cols-2">
          <TabButton
            active={tab === "clock"}
            onClick={() => setTab("clock")}
            icon={<Clock3 size={20} />}
            label={t.employee.tabClock}
          />
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
            icon={<History size={20} />}
            label={t.employee.tabHistory}
          />
        </div>
      </nav>

      {cameraOpen && (
        <CameraCapture
          title={mode === "in" ? t.camera.titleIn : t.camera.titleOut}
          accent={mode === "in" ? "green" : "orange"}
          submitting={submitting}
          onCancel={() => setCameraOpen(false)}
          onConfirm={handleConfirm}
        />
      )}

      {success && (
        <SuccessOverlay
          mode={success.mode}
          record={success.record}
          settings={settings}
          onClose={() => setSuccess(null)}
        />
      )}
    </div>
  );
}

function ClockView({
  mode,
  activeRecord,
  onAction,
  todayRecords,
  settings,
}: {
  mode: "in" | "out";
  activeRecord: AttendanceRecord | null;
  onAction: () => void;
  todayRecords: AttendanceRecord[];
  settings: OtSettings;
}) {
  const { t } = useI18n();
  const todays = useMemo(() => {
    const today = new Date().toDateString();
    return todayRecords.filter(
      (r) => new Date(r.time_in).toDateString() === today
    );
  }, [todayRecords]);

  return (
    <div className="-mt-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          {mode === "in" ? t.employee.notCheckedIn : t.employee.working}
        </p>

        <button
          onClick={onAction}
          className={`group mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-3xl px-6 py-10 text-white shadow-lg transition active:scale-[0.98] ${
            mode === "in"
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700"
              : "bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30 hover:from-orange-500 hover:to-orange-600"
          }`}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            {mode === "in" ? <LogIn size={40} /> : <LogOut size={40} />}
          </span>
          <span className="text-lg font-bold">
            {mode === "in" ? t.employee.checkInBtn : t.employee.checkOutBtn}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-white/80">
            <Camera size={14} />
            {mode === "in" ? t.employee.checkInShort : t.employee.checkOutShort}
          </span>
        </button>

        {activeRecord && (
          <p className="mt-4 text-center text-sm text-slate-500">
            {t.employee.checkedInAtLabel}{" "}
            <span className="font-semibold text-slate-700">
              {new Date(activeRecord.time_in).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        )}
      </div>

      {todays.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 px-1 text-sm font-semibold text-slate-600">
            {t.employee.todaySummary}
          </h2>
          <div className="space-y-3">
            {todays.map((r) => (
              <DayCard key={r.id} record={r} settings={settings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryView({
  records,
  settings,
}: {
  records: AttendanceRecord[];
  settings: OtSettings;
}) {
  const { t } = useI18n();
  const totals = useMemo(() => {
    let work = 0;
    let ot = 0;
    for (const r of records) {
      const b = calcWorkBreakdown(r.time_in, r.time_out, settings);
      work += b.netWorkHours;
      ot += b.otHours;
    }
    return { work, ot };
  }, [records, settings]);

  return (
    <div className="pt-5">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<TimerReset size={18} />}
          label={t.employee.totalWorkHours}
          value={`${roundHours(totals.work).toFixed(1)} ${t.common.hoursShort}`}
          accent="text-brand-600"
        />
        <StatTile
          icon={<Zap size={18} />}
          label={t.employee.totalOt}
          value={`${roundHours(totals.ot).toFixed(1)} ${t.common.hoursShort}`}
          accent="text-amber-600"
        />
      </div>

      <h2 className="mb-2 mt-6 px-1 text-sm font-semibold text-slate-600">
        {t.employee.historyTitle}
      </h2>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
          {t.employee.noHistory}
        </div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-slate-100 pl-4">
          {records.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[1.42rem] top-3 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
              <DayCard record={r} settings={settings} showDate />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DayCard({
  record,
  settings,
  showDate = false,
}: {
  record: AttendanceRecord;
  settings: OtSettings;
  showDate?: boolean;
}) {
  const { t, intlLocale } = useI18n();
  const b = calcWorkBreakdown(record.time_in, record.time_out, settings);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays size={15} className="text-slate-400" />
          {showDate
            ? new Date(record.time_in).toLocaleDateString(intlLocale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                numberingSystem: "latn",
              })
            : t.employee.today}
        </div>
        {record.time_out ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
            {t.employee.done}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />{" "}
            {t.employee.inProgress}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <TimePill
          label={t.employee.timeIn}
          value={new Date(record.time_in).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <TimePill
          label={t.employee.timeOut}
          value={
            record.time_out
              ? new Date(record.time_out).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
      </div>

      {b.isComplete && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">
            {t.employee.worked}{" "}
            <span className="font-semibold text-slate-700">
              {roundHours(b.netWorkHours).toFixed(1)} {t.common.hoursShort}
            </span>
          </span>
          {b.otHours > 0 ? (
            <span className="font-semibold text-amber-600">
              {t.employee.ot} {roundHours(b.otHours).toFixed(1)}{" "}
              {t.common.hoursShort}
            </span>
          ) : (
            <span className="text-slate-400">{t.employee.noOt}</span>
          )}
        </div>
      )}
    </div>
  );
}

function TimePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-mono text-base font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-1.5 ${accent}`}>{icon}</div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
        active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SuccessOverlay({
  mode,
  record,
  settings,
  onClose,
}: {
  mode: "in" | "out";
  record: AttendanceRecord;
  settings: OtSettings;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const b = calcWorkBreakdown(record.time_in, record.time_out, settings);

  useEffect(() => {
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="animate-pop-in w-full max-w-xs rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            mode === "in" ? "bg-emerald-100" : "bg-orange-100"
          }`}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="11"
              className={mode === "in" ? "stroke-emerald-500" : "stroke-orange-500"}
              strokeWidth="1.5"
              opacity="0.25"
            />
            <path
              d="M7 12.5l3.2 3.2L17 9"
              className={`check-path ${
                mode === "in" ? "stroke-emerald-500" : "stroke-orange-500"
              }`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900">
          {t.employee.success}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "in" ? t.employee.successIn : t.employee.successOut}
        </p>

        <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
          <Row
            label={t.employee.timeIn}
            value={new Date(record.time_in).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          {record.time_out && (
            <Row
              label={t.employee.timeOut}
              value={new Date(record.time_out).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
          {b.isComplete && (
            <>
              <Row
                label={t.employee.worked}
                value={`${roundHours(b.netWorkHours).toFixed(1)} ${t.common.hoursShort}`}
              />
              <Row
                label={t.employee.ot}
                value={`${roundHours(b.otHours).toFixed(1)} ${t.common.hoursShort}`}
                highlight={b.otHours > 0}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight ? "text-amber-600" : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function errMsg(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}
