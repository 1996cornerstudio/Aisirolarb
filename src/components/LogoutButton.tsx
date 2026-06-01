import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";

export default function LogoutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          className ||
          "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
        }
      >
        <LogOut size={16} />
        {label}
      </button>
    </form>
  );
}
