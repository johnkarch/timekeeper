import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf, todayISO, formatDateLabel } from "@/lib/dates";
import { fetchOwnEntries } from "@/lib/own-entries";
import NewEntryForm from "./new-entry-form";
import EntryRow from "./entry-row";
import DismissibleBanner from "@/components/dismissible-banner";

function weekLink(monday: string) {
  return `/time-entries?week=${monday}`;
}

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; week?: string }>;
}) {
  const { error, success, week } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monday = mondayOf(week || todayISO());
  const sunday = addDays(monday, 6);

  const entries = await fetchOwnEntries(user.id, monday, sunday);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Log time</h1>
        <p className="text-sm text-gray-500">Enter your hours for a job.</p>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <NewEntryForm weekParam={monday} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Your week</p>
          <h2 className="text-xl font-semibold text-gray-900">
            {formatDateLabel(monday)} – {formatDateLabel(sunday)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={weekLink(addDays(monday, -7))}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            ← Prev week
          </Link>
          <Link
            href={weekLink(addDays(monday, 7))}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            Next week →
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Entries this week</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-4">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} weekParam={monday} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
