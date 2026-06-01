import { createClient } from "@/lib/supabase/server";
import type { Branch } from "@/lib/types";
import SignupForm from "./SignupForm";

export const metadata = {
  title: "Create account · Attendance & OT",
};

export default async function SignupPage() {
  const supabase = createClient();
  const { data } = await supabase.from("branches").select("name").order("name");
  const branches = ((data as Pick<Branch, "name">[]) ?? []).map((b) => b.name);

  return <SignupForm branches={branches} />;
}
