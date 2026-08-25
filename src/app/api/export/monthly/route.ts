import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, currentMonth, firstOfMonth } from "@/lib/dates";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/weekly");

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  const billedParam = searchParams.get("billed");
  const billed = billedParam === "billed" || billedParam === "unbilled" ? billedParam : undefined;
  const q = searchParams.get("q") ?? undefined;

  const start = firstOfMonth(month);
  const end = firstOfMonth(addMonths(month, 1));

  const entries = await fetchMonthlyEntries({ start, end, billed, q });

  const header = ["Date", "Employee", "Job", "Hours", "Notes", "Billed"];
  const rows = entries.map((e) => [
    e.entry_date,
    e.employee_name,
    e.job_name,
    String(e.hours),
    e.notes ?? "",
    e.billed ? "Yes" : "No",
  ]);

  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monthly-${month}.csv"`,
    },
  });
}
