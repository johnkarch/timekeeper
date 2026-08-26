import { fetchEmployeeHoursBreakdown } from "@/lib/employee-hours";

export default async function EmployeeHoursTiles({ periodStart }: { periodStart: string }) {
  const employees = await fetchEmployeeHoursBreakdown(periodStart);

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-gray-900">Pay Period Totals</h2>

      {employees.length === 0 ? (
        <p className="text-sm text-gray-500">No hours logged this period.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <div key={e.user_id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900">{e.employee_name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p>Regular hours: {e.regular.toFixed(2)}</p>
                <p>Overtime hours: {e.overtime.toFixed(2)}</p>
                <p>Weekend hours: {e.weekend.toFixed(2)}</p>
                <p>Vacation/Holiday/PTO: {e.pto.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
