"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function appendParam(url: string, key: string, value: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function bulkUpdateBilled(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const month = String(formData.get("month") ?? "");
  const billedFilter = String(formData.get("billedFilter") ?? "");
  const q = String(formData.get("q") ?? "");

  const params = new URLSearchParams({ month });
  if (billedFilter) params.set("billed", billedFilter);
  if (q) params.set("q", q);
  const backTo = `/monthly?${params.toString()}`;

  if (current.role !== "admin") {
    redirect(appendParam(backTo, "error", "Only admins can do that."));
  }

  const ids = formData.getAll("entryIds").map(String);
  const intent = String(formData.get("intent"));

  if (ids.length === 0) {
    redirect(appendParam(backTo, "error", "Select at least one entry first."));
  }

  const billed = intent === "bill";
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ billed, billed_at: billed ? new Date().toISOString().slice(0, 10) : null })
    .in("id", ids);

  if (error) {
    redirect(appendParam(backTo, "error", error.message));
  }

  revalidatePath("/monthly");
  redirect(appendParam(backTo, "success", "1"));
}
