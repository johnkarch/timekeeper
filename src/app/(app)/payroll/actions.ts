"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function unsubmitWeek(id: string) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/payroll");

  const supabase = await createClient();
  const { error } = await supabase.from("week_submissions").delete().eq("id", id);

  if (error) {
    redirect(`/payroll?error=${encodeURIComponent(error.message)}`);
  }

  // The affected employee's Week Overview needs to unlock immediately too,
  // not just the Payroll list.
  revalidatePath("/payroll");
  revalidatePath("/weekly");
  redirect("/payroll?success=1");
}
