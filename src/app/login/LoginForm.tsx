"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Clock, LogIn, Lock, User } from "lucide-react";
import { signInAction, type AuthResult } from "../auth/actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const initialState: AuthResult = {};

const fieldWrap =
  "flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100";
const inputClass =
  "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function LoginForm() {
  const { t } = useI18n();
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
            <Clock size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.login.welcome}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <form action={formAction} className="space-y-5">
            {(state.error || state.code) && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {state.code === "loginRequired"
                    ? t.login.errorRequired
                    : state.error}
                </span>
              </div>
            )}

            <div>
              <label htmlFor="username" className={labelClass}>
                {t.common.username}
              </label>
              <div className={fieldWrap}>
                <User size={16} className="shrink-0 text-slate-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                  placeholder={t.common.usernamePlaceholder}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                {t.common.password}
              </label>
              <div className={fieldWrap}>
                <Lock size={16} className="shrink-0 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder={t.login.passwordPlaceholder}
                  className={inputClass}
                />
              </div>
            </div>

            <SubmitButton />
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t.login.noAccount}{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {t.login.createOne}
          </Link>
        </p>
      </div>
    </main>
  );
}

function SubmitButton() {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogIn size={16} />
      {pending ? t.login.signingIn : t.common.signIn}
    </button>
  );
}
