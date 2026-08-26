import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { payPeriodStart, todayISO } from "@/lib/dates";
import { fetchAllEmployees } from "@/lib/employees";
import DetailReport from "./detail-report";
import SummaryReport from "./summary-report";
import PayrollReport from "./payroll-report";
import type { Job } from "@/lib/types";

type ReportType = "detail" | "summary" | "payroll";

async function fetchAllJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, name, is_active")
    .order("name");

  if (error) {
    console.error("fetchAllJobs failed:", error);
    return [];
  }
  return data ?? [];
}

function tabHref(type: ReportType) {
  return `/reports?type=${type}`;
}

function tabClass(active: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
  }`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const isAdmin = current.role === "admin";
  const requestedType = typeof params.type === "string" ? params.type : "detail";
  if (requestedType === "payroll" && !isAdmin) redirect("/reports?type=detail");

  const type: ReportType =
    requestedType === "summary" ? "summary" : requestedType === "payroll" ? "payroll" : "detail";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">
          Generate a report with your own date range{isAdmin ? ", employees, and jobs" : " and jobs"}.
        </p>
      </div>

      <nav className="flex gap-1">
        <Link href={tabHref("detail")} className={tabClass(type === "detail")}>
          Detail
        </Link>
        <Link href={tabHref("summary")} className={tabClass(type === "summary")}>
          Summary
        </Link>
        {isAdmin && (
          <Link href={tabHref("payroll")} className={tabClass(type === "payroll")}>
            Payroll
          </Link>
        )}
      </nav>

      {type === "detail" && (
        <DetailReport
          searchParams={params}
          current={current}
          employees={isAdmin ? await fetchAllEmployees() : []}
          jobs={await fetchAllJobs()}
        />
      )}
      {type === "summary" && (
        <SummaryReport
          searchParams={params}
          current={current}
          employees={isAdmin ? await fetchAllEmployees() : []}
          jobs={await fetchAllJobs()}
        />
      )}
      {type === "payroll" && isAdmin && (
        <PayrollReport
          periodStart={payPeriodStart(typeof params.period === "string" ? params.period : todayISO())}
          scope={params.scope === "all" ? "all" : "submitted"}
        />
      )}
    </div>
  );
}
