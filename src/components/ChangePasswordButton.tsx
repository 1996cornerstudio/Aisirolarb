"use client";

import { useState } from "react";
import { KeyRound, Lock, X, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * Self-service password change for the signed-in user. Works fully client-side
 * via `supabase.auth.updateUser` (no service role needed).
 */
export default function ChangePasswordButton({
  className,
}: {
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        }
      >
        <KeyRound size={15} />
        {t.common.changePassword}
      </button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (pw.length < 6) {
      setError(t.changePassword.tooShort);
      return;
    }
    if (pw !== confirm) {
      setError(t.changePassword.mismatch);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(onClose, 1200);
  }

  const inputClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400";
  const fieldWrap =
    "flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">
            {t.changePassword.title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {done && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{t.changePassword.success}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className={fieldWrap}>
            <Lock size={16} className="shrink-0 text-slate-400" />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t.changePassword.newPassword}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <Lock size={16} className="shrink-0 text-slate-400" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t.changePassword.confirmPassword}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={busy || done}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? t.changePassword.updating : t.changePassword.submit}
        </button>
      </div>
    </div>
  );
}
