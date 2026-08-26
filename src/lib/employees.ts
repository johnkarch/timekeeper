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
