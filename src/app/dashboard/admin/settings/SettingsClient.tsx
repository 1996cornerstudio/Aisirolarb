"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  KeyRound,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type {
  AppSettings,
  AttendanceRecord,
  Branch,
  Profile,
} from "@/lib/types";
import { settingsFromRow } from "@/lib/attendance";
import { toCsv, downloadCsv } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";
import ChangePasswordButton from "@/components/ChangePasswordButton";
import {
  addBranchAction,
  createUserAction,
  deleteBranchAction,
  deleteUserAction,
  resetPasswordAction,
  updateEmployeeAction,
  updateSettingsAction,
  type ActionResult,
} from "./actions";

interface Props {
  profile: Profile;
  employees: Profile[];
  settings: AppSettings | null;
  branches: Branch[];
  records: AttendanceRecord[];
  serviceKeyReady: boolean;
}

type Tab = "users" | "export" | "defaults" | "branches";

const initial: ActionResult = {};

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function SettingsClient({
  profile,
  employees,
  settings,
  branches,
  records,
  serviceKeyReady,
}: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: t.settings.tabEmployees, icon: <Users size={16} /> },
    { id: "export", label: t.settings.tabExport, icon: <Download size={16} /> },
    { id: "defaults", label: t.settings.tabDefaults, icon: <Clock size={16} /> },
    { id: "branches", label: t.settings.tabBranches, icon: <Building2 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <SettingsIcon size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t.settings.title}
              </h1>
              <p className="text-sm text-slate-500">{t.settings.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={15} />
              {t.settings.back}
            </Link>
            <LanguageSwitcher />
            <ChangePasswordButton />
            <LogoutButton />
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === tb.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <UsersTab
            employees={employees}
            branches={branches}
            settings={settings}
            serviceKeyReady={serviceKeyReady}
            currentUserId={profile.id}
          />
        )}
        {tab === "export" && (
          <ExportTab records={records} employees={employees} />
        )}
        {tab === "defaults" && <DefaultsTab settings={settings} />}
        {tab === "branches" && <BranchesTab branches={branches} />}
      </div>
    </div>
  );
}

/* ----------------------------- shared bits ----------------------------- */

function useResultMessage() {
  const { t } = useI18n();
  return function render(res: ActionResult) {
    if (!res || (!res.code && !res.error)) return null;
    const okCodes = ["created", "updated", "passwordReset", "branchAdded", "deleted"];
    const ok = res.ok || (res.code && okCodes.includes(res.code));
    const text =
      res.code === "created"
        ? t.settings.msgCreated
        : res.code === "updated"
        ? t.settings.msgUpdated
        : res.code === "passwordReset"
        ? t.settings.msgPasswordReset
        : res.code === "branchAdded"
        ? t.settings.msgBranchAdded
        : res.code === "required"
        ? t.settings.errRequired
        : res.code === "passwordShort"
        ? t.settings.errPasswordShort
        : res.code === "forbidden"
        ? t.settings.errForbidden
        : res.code === "noServiceKey"
        ? t.settings.errNoServiceKey
        : res.error || t.settings.errGeneric;
    return (
      <div
        className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}
      >
        {ok ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
        )}
        <span>{text}</span>
      </div>
    );
  };
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

/* ------------------------------ users tab ------------------------------ */

function UsersTab({
  employees,
  branches,
  settings,
  serviceKeyReady,
  currentUserId,
}: {
  employees: Profile[];
  branches: Branch[];
  settings: AppSettings | null;
  serviceKeyReady: boolean;
  currentUserId: string;
}) {
  const { t, locale } = useI18n();
  const [createState, createForm] = useFormState(createUserAction, initial);
  const renderMsg = useResultMessage();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);

  const branchNames = branches.map((b) => b.name);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Create user */}
      <section className={`${card} lg:col-span-2`}>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-slate-800">
            {t.settings.createTitle}
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">{t.settings.createHint}</p>

        {!serviceKeyReady && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{t.settings.serviceKeyWarning}</span>
          </div>
        )}

        <form action={createForm} className="space-y-3">
          {renderMsg(createState)}
          <input type="hidden" name="language" value={locale} />
          <div>
            <label className={labelClass}>{t.settings.fullName}</label>
            <input name="name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t.common.email}</label>
            <input
              name="email"
              type="email"
              required
              placeholder={t.common.emailPlaceholder}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t.common.branch}</label>
              <select name="branch" className={`${inputClass} cursor-pointer`}>
                <option value="">{t.common.noBranch}</option>
                {branchNames.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t.settings.role}</label>
              <select name="role" className={`${inputClass} cursor-pointer`}>
                <option value="employee">{t.settings.roleEmployee}</option>
                <option value="admin">{t.settings.roleAdmin}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>{t.settings.tempPassword}</label>
            <input
              name="password"
              type="text"
              required
              minLength={6}
              placeholder="••••••"
              className={inputClass}
            />
          </div>
          <Submit idle={t.settings.create} busy={t.settings.creating} />
        </form>
      </section>

      {/* Employees list */}
      <section className={`${card} lg:col-span-3`}>
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-slate-800">
            {t.settings.employeesTitle}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {employees.length}
            </span>
          </h2>
        </div>

        {employees.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {t.settings.noEmployees}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {employees.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-800">
                      {e.name}
                    </span>
                    {e.role === "admin" && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                        {t.settings.roleAdmin}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {e.branch ?? t.common.noBranch}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn
                    title={t.settings.editUser}
                    onClick={() => setEditing(e)}
                  >
                    <Pencil size={15} />
                  </IconBtn>
                  <IconBtn
                    title={t.settings.resetPassword}
                    onClick={() => setResetting(e)}
                  >
                    <KeyRound size={15} />
                  </IconBtn>
                  {e.id !== currentUserId && (
                    <form
                      action={deleteUserAction}
                      onSubmit={(ev) => {
                        if (!confirm(t.settings.deleteConfirm))
                          ev.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        title={t.settings.deleteUser}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <EditEmployeeModal
          employee={editing}
          branches={branchNames}
          settings={settings}
          onClose={() => setEditing(null)}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          employee={resetting}
          serviceKeyReady={serviceKeyReady}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
    >
      {children}
    </button>
  );
}

function timeValue(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

function EditEmployeeModal({
  employee,
  branches,
  settings,
  onClose,
}: {
  employee: Profile;
  branches: string[];
  settings: AppSettings | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [state, formAction] = useFormState(updateEmployeeAction, initial);
  const renderMsg = useResultMessage();
  const g = settingsFromRow(settings);

  return (
    <ModalShell title={`${t.settings.editUser} · ${employee.name}`} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {renderMsg(state)}
        <input type="hidden" name="id" value={employee.id} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t.settings.role}</label>
            <select
              name="role"
              defaultValue={employee.role}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="employee">{t.settings.roleEmployee}</option>
              <option value="admin">{t.settings.roleAdmin}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.common.branch}</label>
            <select
              name="branch"
              defaultValue={employee.branch ?? ""}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">{t.common.noBranch}</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-700">
            {t.settings.overridesTitle}
          </p>
          <p className="mb-3 text-xs text-slate-400">{t.settings.overridesHint}</p>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              name="standard_hours"
              label={t.settings.standardHours}
              def={employee.standard_hours}
              placeholder={String(g.standardHours)}
            />
            <NumField
              name="break_hours"
              label={t.settings.breakHours}
              def={employee.break_hours}
              placeholder={String(g.breakHours)}
            />
            <div>
              <label className={labelClass}>{t.settings.shiftStart}</label>
              <input
                type="time"
                name="shift_start"
                defaultValue={timeValue(employee.shift_start)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t.settings.shiftEnd}</label>
              <input
                type="time"
                name="shift_end"
                defaultValue={timeValue(employee.shift_end)}
                className={inputClass}
              />
            </div>
            <NumField
              name="late_grace_minutes"
              label={t.settings.lateGrace}
              def={employee.late_grace_minutes}
              placeholder={String(g.lateGraceMinutes)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t.common.cancel}
          </button>
          <Submit idle={t.common.save} busy={t.common.saving} />
        </div>
      </form>
    </ModalShell>
  );
}

function NumField({
  name,
  label,
  def,
  placeholder,
}: {
  name: string;
  label: string;
  def: number | null;
  placeholder: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        step="0.5"
        name={name}
        defaultValue={def ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function ResetPasswordModal({
  employee,
  serviceKeyReady,
  onClose,
}: {
  employee: Profile;
  serviceKeyReady: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [state, formAction] = useFormState(resetPasswordAction, initial);
  const renderMsg = useResultMessage();

  return (
    <ModalShell
      title={`${t.settings.resetPassword} · ${employee.name}`}
      onClose={onClose}
    >
      <form action={formAction} className="space-y-4">
        {renderMsg(state)}
        {!serviceKeyReady && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{t.settings.serviceKeyWarning}</span>
          </div>
        )}
        <input type="hidden" name="id" value={employee.id} />
        <p className="text-sm text-slate-500">{t.settings.resetPasswordHint}</p>
        <div>
          <label className={labelClass}>{t.settings.tempPassword}</label>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="••••••"
            className={inputClass}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t.common.cancel}
          </button>
          <Submit idle={t.settings.resetPassword} busy={t.common.saving} />
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------------- export tab ------------------------------ */

function ExportTab({
  records,
  employees,
}: {
  records: AttendanceRecord[];
  employees: Profile[];
}) {
  const { t } = useI18n();

  function exportAttendance() {
    // Matches the raw Supabase report format exactly.
    const headers = [
      "ID",
      "BRANCH",
      "NAME",
      "TIME IN",
      "PHOTO IN",
      "TIME OUT",
      "PHOTO OUT",
      "REMARK",
    ];
    const sorted = [...records].sort(
      (a, b) => new Date(a.time_in).getTime() - new Date(b.time_in).getTime()
    );
    const rows = sorted.map((r) => [
      r.id,
      r.branch,
      r.name,
      rawDateTime(r.time_in),
      r.photo_in ?? "null",
      rawDateTime(r.time_out),
      r.photo_out ?? "null",
      r.remark ?? "null",
    ]);
    downloadCsv(`attendance-report-${stamp()}.csv`, toCsv(headers, rows));
  }

  function exportEmployees() {
    const headers = ["Name", "Branch", "Role", "Language"];
    const rows = employees.map((e) => [e.name, e.branch ?? "", e.role, e.language]);
    downloadCsv(`users-${stamp()}.csv`, toCsv(headers, rows));
  }

  return (
    <section className={`${card} max-w-2xl`}>
      <div className="mb-4 flex items-center gap-2">
        <Download size={18} className="text-brand-600" />
        <h2 className="text-base font-semibold text-slate-800">
          {t.settings.exportTitle}
        </h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">{t.settings.exportHint}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={exportAttendance}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <Download size={16} />
          {t.settings.exportAttendance}
        </button>
        <button
          onClick={exportEmployees}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <Download size={16} />
          {t.settings.exportEmployees}
        </button>
      </div>
    </section>
  );
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Raw DB-style timestamp "YYYY-MM-DD HH:MM:SS" (no timezone conversion). */
function rawDateTime(iso: string | null): string {
  if (!iso) return "null";
  return iso.slice(0, 19).replace("T", " ");
}

/* ---------------------------- defaults tab ----------------------------- */

function DefaultsTab({ settings }: { settings: AppSettings | null }) {
  const { t } = useI18n();
  const [state, formAction] = useFormState(updateSettingsAction, initial);
  const renderMsg = useResultMessage();
  const g = settingsFromRow(settings);

  return (
    <section className={`${card} max-w-2xl`}>
      <div className="mb-4 flex items-center gap-2">
        <Clock size={18} className="text-brand-600" />
        <h2 className="text-base font-semibold text-slate-800">
          {t.settings.defaultsTitle}
        </h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">{t.settings.defaultsHint}</p>

      <form action={formAction} className="space-y-4">
        {renderMsg(state)}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.settings.standardHours}</label>
            <input
              type="number"
              step="0.5"
              name="standard_hours"
              defaultValue={g.standardHours}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.settings.breakHours}</label>
            <input
              type="number"
              step="0.5"
              name="break_hours"
              defaultValue={g.breakHours}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.settings.shiftStart}</label>
            <input
              type="time"
              name="shift_start"
              defaultValue={g.shiftStart.slice(0, 5)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.settings.shiftEnd}</label>
            <input
              type="time"
              name="shift_end"
              defaultValue={g.shiftEnd.slice(0, 5)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.settings.lateGrace}</label>
            <input
              type="number"
              step="1"
              name="late_grace_minutes"
              defaultValue={g.lateGraceMinutes}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Submit idle={t.common.save} busy={t.common.saving} />
        </div>
      </form>
    </section>
  );
}

/* ---------------------------- branches tab ----------------------------- */

function BranchesTab({ branches }: { branches: Branch[] }) {
  const { t } = useI18n();
  const [state, formAction] = useFormState(addBranchAction, initial);
  const renderMsg = useResultMessage();

  return (
    <section className={`${card} max-w-xl`}>
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={18} className="text-brand-600" />
        <h2 className="text-base font-semibold text-slate-800">
          {t.settings.branchesTitle}
        </h2>
      </div>

      <form action={formAction} className="mb-5 space-y-3">
        {renderMsg(state)}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className={labelClass}>{t.settings.branchName}</label>
            <input name="name" required className={inputClass} />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={16} />
            {t.settings.addBranch}
          </button>
        </div>
      </form>

      {branches.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {t.settings.noBranches}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 size={15} className="text-slate-400" />
                {b.name}
              </span>
              <form
                action={deleteBranchAction}
                onSubmit={(ev) => {
                  if (!confirm(t.settings.deleteBranchConfirm))
                    ev.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  title={t.settings.removeBranch}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                  {t.settings.removeBranch}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------- modal --------------------------------- */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
