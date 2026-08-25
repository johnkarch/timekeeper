import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewEntryForm from "./new-entry-form";
import DismissibleBanner from "@/components/dismissible-banner";

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Log time</h1>
        <p className="text-sm text-gray-500">Enter your hours for a job.</p>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <NewEntryForm />
    </div>
  );
}
