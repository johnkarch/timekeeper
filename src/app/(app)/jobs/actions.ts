"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidJobName } from "@/lib/job-format";

async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/weekly");
  return current;
}

export async function createJob(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();

  if (!isValidJobName(name)) {
    redirect(`/jobs?error=${encodeURIComponent("Job must start with a 6-digit number.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({ name });

  if (error) {
    const message = error.code === "23505" ? "That job number is already in use." : error.message;
    redirect(`/jobs?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}

export async function updateJob(id: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!isValidJobName(name)) {
    redirect(`/jobs?error=${encodeURIComponent("Job must start with a 6-digit number.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ name, notes }).eq("id", id);

  if (error) {
    const message = error.code === "23505" ? "That job number is already in use." : error.message;
    redirect(`/jobs?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}

export async function deleteJob(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    const message =
      error.code === "23503"
        ? "Can't delete this job — it has time entries logged against it. Deactivate it instead."
        : error.message;
    redirect(`/jobs?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}

export async function bulkSetJobActive(formData: FormData) {
  await requireAdmin();

  const ids = formData.getAll("jobIds").map(String);
  const intent = String(formData.get("intent"));

  if (ids.length === 0) {
    redirect(`/jobs?error=${encodeURIComponent("Select at least one job first.")}`);
  }

  const isActive = intent === "activate";
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ is_active: isActive }).in("id", ids);

  if (error) {
    redirect(`/jobs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}

export async function bulkUpdateBilled(formData: FormData) {
  await requireAdmin();

  const ids = formData.getAll("entryIds").map(String);
  const intent = String(formData.get("intent"));

  if (ids.length === 0) {
    redirect(`/jobs?error=${encodeURIComponent("Select at least one entry first.")}`);
  }

  const billed = intent === "bill";
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ billed, billed_at: billed ? new Date().toISOString().slice(0, 10) : null })
    .in("id", ids);

  if (error) {
    redirect(`/jobs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}
