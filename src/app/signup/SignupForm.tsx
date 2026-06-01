"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { signUpAction, type AuthResult } from "../auth/actions";

const initialState: AuthResult = {};

// Known branches from the company data — extend as needed.
const BRANCHES = ["BANGRAK", "ONNUT"];

const fieldWrap =
  "flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100";
const inputClass =
  "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function SignupForm() {
  const [state, formAction] = useFormState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Full name
        </label>
        <div className={fieldWrap}>
          <User size={16} className="shrink-0 text-slate-400" />
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Jane Doe"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="branch" className={labelClass}>
          Branch
        </label>
        <div className={fieldWrap}>
          <Building2 size={16} className="shrink-0 text-slate-400" />
          <select
            id="branch"
            name="branch"
            defaultValue={BRANCHES[0]}
            className={`${inputClass} cursor-pointer`}
          >
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <div className={fieldWrap}>
          <Mail size={16} className="shrink-0 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className={fieldWrap}>
          <Lock size={16} className="shrink-0 text-slate-400" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="adminCode" className={labelClass}>
          Admin code{" "}
          <span className="font-normal normal-case text-slate-400">
            (optional)
          </span>
        </label>
        <div className={fieldWrap}>
          <KeyRound size={16} className="shrink-0 text-slate-400" />
          <input
            id="adminCode"
            name="adminCode"
            type="password"
            placeholder="Leave blank to join as employee"
            className={inputClass}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Enter the secret code to register as an administrator.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <UserPlus size={16} />
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}
