"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/weekly");
  return current;
}

function fail(message: string): never {
  redirect(`/business?error=${encodeURIComponent(message)}`);
}

function succeed(): never {
  redirect("/business?success=1");
}

// ----------------------------------------------------------------------------
// Work Types
// ----------------------------------------------------------------------------

export async function createWorkType(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) fail("Enter a work type name.");

  const supabase = await createClient();
  const { error } = await supabase.from("work_types").insert({ name });

  if (error) {
    fail(error.code === "23505" ? "That work type name is already in use." : error.message);
  }

  revalidatePath("/business");
  succeed();
}

export async function updateWorkType(id: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) fail("Enter a work type name.");

  const supabase = await createClient();
  const { error } = await supabase.from("work_types").update({ name }).eq("id", id);

  if (error) {
    fail(error.code === "23505" ? "That work type name is already in use." : error.message);
  }

  revalidatePath("/business");
  succeed();
}

export async function setWorkTypeActive(id: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("work_types").update({ is_active: isActive }).eq("id", id);

  if (error) fail(error.message);

  revalidatePath("/business");
}

export async function deleteWorkType(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("work_types").delete().eq("id", id);

  if (error) {
    fail(
      error.code === "23503"
        ? "Can't delete this work type — it has time entries logged against it. Deactivate it instead."
        : error.message
    );
  }

  revalidatePath("/business");
  succeed();
}

// ----------------------------------------------------------------------------
// Bill Rates
// ----------------------------------------------------------------------------

export async function addBillRate(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const workTypeId = String(formData.get("work_type_id") ?? "");
  const jobId = String(formData.get("job_id") ?? "").trim() || null;
  const rate = Number(formData.get("rate"));

  if (!userId || !workTypeId) fail("Choose an employee and a work type.");
  if (!Number.isFinite(rate) || rate < 0) fail("Enter a valid rate.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bill_rates")
    .insert({ user_id: userId, work_type_id: workTypeId, job_id: jobId, rate });

  if (error) {
    fail(
      error.code === "23505"
        ? "A rate already exists for that combination — edit it below instead."
        : error.message
    );
  }

  revalidatePath("/business");
  succeed();
}

export async function updateBillRate(id: string, formData: FormData) {
  await requireAdmin();

  const rate = Number(formData.get("rate"));
  if (!Number.isFinite(rate) || rate < 0) fail("Enter a valid rate.");

  const supabase = await createClient();
  const { error } = await supabase.from("bill_rates").update({ rate }).eq("id", id);

  if (error) fail(error.message);

  revalidatePath("/business");
  succeed();
}

export async function deleteBillRate(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("bill_rates").delete().eq("id", id);

  if (error) fail(error.message);

  revalidatePath("/business");
}

// ----------------------------------------------------------------------------
// Wage Rates
// ----------------------------------------------------------------------------

export async function addWageRate(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const hourlyRate = Number(formData.get("hourly_rate"));
  const effectiveDate = String(formData.get("effective_date") ?? "");

  if (!userId) fail("Choose an employee.");
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) fail("Enter a valid hourly rate.");
  if (!effectiveDate) fail("Choose an effective date.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("wage_rates")
    .insert({ user_id: userId, hourly_rate: hourlyRate, effective_date: effectiveDate });

  if (error) {
    fail(
      error.code === "23505"
        ? "A wage rate already exists for that employee on that date."
        : error.message
    );
  }

  revalidatePath("/business");
  succeed();
}

// ----------------------------------------------------------------------------
// PTO
// ----------------------------------------------------------------------------

export async function addPtoAdjustment(formData: FormData) {
  const current = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const hours = Number(formData.get("hours"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) fail("Choose an employee.");
  if (!Number.isFinite(hours) || hours === 0) fail("Enter a non-zero number of hours.");
  if (!reason) fail("Enter a reason.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("pto_adjustments")
    .insert({ user_id: userId, hours, reason, created_by: current.user.id });

  if (error) fail(error.message);

  revalidatePath("/business");
  succeed();
}
