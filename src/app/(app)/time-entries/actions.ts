"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export async function searchJobs(text: string): Promise<Job[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, name, is_active")
    .ilike("name", `%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(8);

  if (error) {
    console.error("searchJobs query failed:", error);
    return [];
  }

  return data ?? [];
}

async function findActiveJobOrRedirect(jobText: string, redirectPath: string) {
  const trimmed = jobText.trim();
  if (!trimmed) {
    redirect(`${redirectPath}?error=${encodeURIComponent("Choose a job.")}`);
  }

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, is_active")
    .ilike("name", trimmed)
    .maybeSingle();

  if (!job) {
    redirect(
      `${redirectPath}?error=${encodeURIComponent(
        "No job found matching that text — pick one from the dropdown."
      )}`
    );
  }
  if (!job.is_active) {
    redirect(`${redirectPath}?error=${encodeURIComponent("That job is marked inactive.")}`);
  }

  return job;
}

function parseEntryFields(formData: FormData) {
  const jobText = String(formData.get("job") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return { jobText, entryDate, hours, notes };
}

function validateDateAndHours(entryDate: string, hours: number, redirectPath: string) {
  if (!entryDate || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(`${redirectPath}?error=${encodeURIComponent("Enter a valid date and hours (0–24).")}`);
  }
}

export async function createTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { jobText, entryDate, hours, notes } = parseEntryFields(formData);
  validateDateAndHours(entryDate, hours, "/time-entries");
  const job = await findActiveJobOrRedirect(jobText, "/time-entries");

  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    job_id: job.id,
    entry_date: entryDate,
    hours,
    notes,
  });

  if (error) {
    redirect(`/time-entries?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/time-entries");
  redirect("/time-entries?success=1");
}

export async function updateTimeEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const { jobText, entryDate, hours, notes } = parseEntryFields(formData);
  validateDateAndHours(entryDate, hours, "/time-entries");
  const job = await findActiveJobOrRedirect(jobText, "/time-entries");

  const { error } = await supabase
    .from("time_entries")
    .update({ job_id: job.id, entry_date: entryDate, hours, notes })
    .eq("id", id);

  if (error) {
    redirect(`/time-entries?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/time-entries");
  redirect("/time-entries?success=1");
}

export async function deleteTimeEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);

  if (error) {
    redirect(`/time-entries?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/time-entries");
}
