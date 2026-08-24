import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, mondayOf, todayISO } from "@/lib/dates";
import { fetchWeeklyEntries } from "@/lib/weekly-entries";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { role } = current;

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") ?? undefined;
  const employeeId = role === "admin" ? (searchParams.get("employee") ?? undefined) : undefined;
  const q = role === "admin" ? (searchParams.get("q") ?? undefined) : undefined;

  const monday = mondayOf(week || todayISO());
  const sunday = addDays(monday, 6);

  const entries = await fetchWeeklyEntries(role, { monday, sunday, employeeId, q });

  const header =
    role === "admin"
      ? ["Date", "Employee", "Job", "Hours", "Notes", "Billed"]
      : ["Date", "Job", "Hours", "Notes", "Billed"];

  const rows = entries.map((e) => {
    const row = [e.entry_date];
    if (role === "admin") row.push(e.employee_name);
    row.push(e.job_name, String(e.hours), e.notes ?? "", e.billed ? "Yes" : "No");
    return row;
  });

  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weekly-${monday}.csv"`,
    },
  });
}
