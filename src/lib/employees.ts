import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

// The roster used by every admin picker on the Business Management page
// (bill rates, wage rates, PTO). RLS on profiles already limits this to
// admins — see "profiles: read own or read all if admin" in schema.sql.
export async function fetchAllEmployees(): Promise<Employee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  if (error) {
    console.error("fetchAllEmployees failed:", error);
    return [];
  }

  return data ?? [];
}

// Looks up a single employee by id — used when an admin views or exports
// another employee's Timesheet report and there's no already-fetched roster
// to search (unlike the page, which already has fetchAllEmployees() in
// hand). RLS ("profiles: read own or read all if admin") already gates this
// the same way as fetchAllEmployees.
export async function fetchEmployeeById(id: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchEmployeeById failed:", error);
    return null;
  }
  return data;
}
