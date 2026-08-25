import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, mondayOf, todayISO } from "@/lib/dates";
import { fetchOwnEntries } from "@/lib/own-entries";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") ?? undefined;

  const monday = mondayOf(week || todayISO());
  const sunday = addDays(monday, 6);

  const entries = await fetchOwnEntries(current.user.id, monday, sunday);

  const header = ["Date", "Job", "Hours", "Notes", "Billed"];
  const rows = entries.map((e) => [
    e.entry_date,
    e.job_name,
    String(e.hours),
    e.notes ?? "",
    e.billed ? "Yes" : "No",
  ]);

  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weekly-${monday}.csv"`,
    },
  });
}
