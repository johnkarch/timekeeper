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

// Redirects back to /weekly, preserving whichever week the user was
// viewing so adding an entry doesn't bounce them back to the current week.
function weeklyPath(week: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (week) params.set("week", week);
  const qs = params.toString();
  return qs ? `/weekly?${qs}` : "/weekly";
}

async function findActiveJobOrRedirect(jobText: string, week: string) {
  const trimmed = jobText.trim();
  if (!trimmed) {
    redirect(weeklyPath(week, { error: "Choose a job." }));
  }

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, is_active")
    .ilike("name", trimmed)
    .maybeSingle();

  if (!job) {
    redirect(
      weeklyPath(week, {
        error: "No job found matching that text — pick one from the dropdown.",
      })
    );
  }
  if (!job.is_active) {
    redirect(weeklyPath(week, { error: "That job is marked inactive." }));
  }

  return job;
}

export async function createTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobText = String(formData.get("job") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const week = String(formData.get("week") ?? "");

  if (!entryDate || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(weeklyPath(week, { error: "Enter a valid date and hours (0–24)." }));
  }

  const job = await findActiveJobOrRedirect(jobText, week);

  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    job_id: job.id,
    entry_date: entryDate,
    hours,
    notes,
  });

  if (error) {
    redirect(weeklyPath(week, { error: error.message }));
  }

  revalidatePath("/weekly");
  redirect(weeklyPath(week, { success: "1" }));
}

export async function updateTimeEntry(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobText = String(formData.get("job") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const week = String(formData.get("week") ?? "");

  if (!entryDate || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(weeklyPath(week, { error: "Enter a valid date and hours (0–24)." }));
  }

  const job = await findActiveJobOrRedirect(jobText, week);

  const { data, error } = await supabase
    .from("time_entries")
    .update({ job_id: job.id, entry_date: entryDate, hours, notes })
    .eq("id", id)
    .select("id");

  if (error) {
    redirect(weeklyPath(week, { error: error.message }));
  }
  if (!data || data.length === 0) {
    redirect(
      weeklyPath(week, {
        error: "Couldn't save that entry — it may already be billed or its week submitted.",
      })
    );
  }

  revalidatePath("/weekly");
  redirect(weeklyPath(week, { success: "1" }));
}

export async function deleteTimeEntry(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week = String(formData.get("week") ?? "");

  const { data, error } = await supabase.from("time_entries").delete().eq("id", id).select("id");

  if (error) {
    redirect(weeklyPath(week, { error: error.message }));
  }
  if (!data || data.length === 0) {
    redirect(
      weeklyPath(week, {
        error: "Couldn't delete that entry — it may already be billed or its week submitted.",
      })
    );
  }

  revalidatePath("/weekly");
  redirect(weeklyPath(week, { success: "1" }));
}

export async function submitWeek(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week = String(formData.get("week") ?? "");
  if (!week) redirect(weeklyPath(week, { error: "Missing week." }));

  const { error } = await supabase
    .from("week_submissions")
    .insert({ user_id: user.id, week_start: week });

  // A unique-violation just means it's already submitted (e.g. a
  // double-click) — treat that as a no-op rather than an error.
  if (error && error.code !== "23505") {
    redirect(weeklyPath(week, { error: error.message }));
  }

  revalidatePath("/weekly");
  redirect(weeklyPath(week, { success: "1" }));
}
