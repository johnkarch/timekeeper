import type { Employee } from "@/lib/types";

// Pure — deliberately kept free of any server-only import (unlike
// src/lib/employees.ts) so client components can use it without dragging
// the Supabase server client into the browser bundle.
export function employeeLabel(employee: Employee): string {
  return employee.full_name || employee.email || "Unknown";
}
