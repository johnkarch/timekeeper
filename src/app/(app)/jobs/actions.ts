"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidJobName } from "@/lib/job-format";

async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/time-entries");
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

export async function updateJobName(id: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!isValidJobName(name)) {
    redirect(`/jobs?error=${encodeURIComponent("Job must start with a 6-digit number.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ name }).eq("id", id);

  if (error) {
    const message = error.code === "23505" ? "That job number is already in use." : error.message;
    redirect(`/jobs?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/jobs");
  redirect("/jobs?success=1");
}

export async function setJobActive(id: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ is_active: isActive }).eq("id", id);

  if (error) {
    redirect(`/jobs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/jobs");
}
