import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { fetchSubmissions } from "@/lib/week-submissions";
import { addDays, formatDateLabel } from "@/lib/dates";
import UnsubmitButton from "./unsubmit-button";
import DismissibleBanner from "@/components/dismissible-banner";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");

  // No role filtering needed here — RLS already scopes this to "your own
  // submissions, or everyone's if you're an admin."
  const submissions = await fetchSubmissions();
  const isAdmin = current.role === "admin";
  const colCount = isAdmin ? 4 : 2;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-500">Payroll</p>
        <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Submitted weeks</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                {isAdmin && <th className="px-4 py-2 font-medium">Employee</th>}
                <th className="px-4 py-2 font-medium">Week</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                {isAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-6 text-center text-gray-500">
                    No weeks submitted yet.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    {isAdmin && <td className="px-4 py-2">{s.employee_name}</td>}
                    <td className="px-4 py-2 whitespace-nowrap">
                      {formatDateLabel(s.week_start)} – {formatDateLabel(addDays(s.week_start, 6))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {formatDateLabel(s.submitted_at.slice(0, 10))}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        <UnsubmitButton submissionId={s.id} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
