"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, LogIn, Lock, Mail } from "lucide-react";
import { signInAction, type AuthResult } from "../auth/actions";

const initialState: AuthResult = {};

const fieldWrap =
  "flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100";
const inputClass =
  "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

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
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={inputClass}
          />
        </div>
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
      <LogIn size={16} />
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
