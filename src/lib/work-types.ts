import { createClient } from "@/lib/supabase/server";
import type { WorkType } from "@/lib/types";

// Active-only list for the Log Time form's picker — an inactive work type
// shouldn't be selectable for new entries, only still displayable on old ones.
export async function fetchActiveWorkTypes(): Promise<WorkType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_types")
    .select("id, name, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("fetchActiveWorkTypes failed:", error);
    return [];
  }

  return data ?? [];
}

// Every work type, active or not — used when editing an existing entry so a
// since-deactivated work type still shows up as the entry's current value.
export async function fetchAllWorkTypes(): Promise<WorkType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_types")
    .select("id, name, is_active")
    .order("name");

  if (error) {
    console.error("fetchAllWorkTypes failed:", error);
    return [];
  }

  return data ?? [];
}
