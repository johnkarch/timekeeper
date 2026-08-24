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

// Redirects back to /time-entries, preserving whichever week the user was
// viewing so an add/edit/delete doesn't silently bounce them back to the
// current week.
function timeEntriesPath(week: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (week) params.set("week", week);
  const qs = params.toString();
  return qs ? `/time-entries?${qs}` : "/time-entries";
}

async function findActiveJobOrRedirect(jobText: string, week: string) {
  const trimmed = jobText.trim();
  if (!trimmed) {
    redirect(timeEntriesPath(week, { error: "Choose a job." }));
  }

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, is_active")
    .ilike("name", trimmed)
    .maybeSingle();

  if (!job) {
    redirect(
      timeEntriesPath(week, {
        error: "No job found matching that text — pick one from the dropdown.",
      })
    );
  }
  if (!job.is_active) {
    redirect(timeEntriesPath(week, { error: "That job is marked inactive." }));
  }

  return job;
}

function parseEntryFields(formData: FormData) {
  const jobText = String(formData.get("job") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const week = String(formData.get("week") ?? "");
  return { jobText, entryDate, hours, notes, week };
}

function validateDateAndHours(entryDate: string, hours: number, week: string) {
  if (!entryDate || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(timeEntriesPath(week, { error: "Enter a valid date and hours (0–24)." }));
  }
}

export async function createTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { jobText, entryDate, hours, notes, week } = parseEntryFields(formData);
  validateDateAndHours(entryDate, hours, week);
  const job = await findActiveJobOrRedirect(jobText, week);

  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    job_id: job.id,
    entry_date: entryDate,
    hours,
    notes,
  });

  if (error) {
    redirect(timeEntriesPath(week, { error: error.message }));
  }

  revalidatePath("/time-entries");
  redirect(timeEntriesPath(week, { success: "1" }));
}

export async function updateTimeEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const { jobText, entryDate, hours, notes, week } = parseEntryFields(formData);
  validateDateAndHours(entryDate, hours, week);
  const job = await findActiveJobOrRedirect(jobText, week);

  const { error } = await supabase
    .from("time_entries")
    .update({ job_id: job.id, entry_date: entryDate, hours, notes })
    .eq("id", id);

  if (error) {
    redirect(timeEntriesPath(week, { error: error.message }));
  }

  revalidatePath("/time-entries");
  redirect(timeEntriesPath(week, { success: "1" }));
}

export async function deleteTimeEntry(id: string, formData: FormData) {
  const week = String(formData.get("week") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);

  if (error) {
    redirect(timeEntriesPath(week, { error: error.message }));
  }

  revalidatePath("/time-entries");
}
