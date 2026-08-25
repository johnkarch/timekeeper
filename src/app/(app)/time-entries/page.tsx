import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TimeEntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold text-gray-900">Log time</h1>
      <p className="text-sm text-gray-500">
        This page is being retired — use Week Overview to log time now.
      </p>
    </div>
  );
}
