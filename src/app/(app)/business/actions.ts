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
// Bill Rates
// ----------------------------------------------------------------------------

export async function addBillRate(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const rate = Number(formData.get("rate"));
  const effectiveDate = String(formData.get("effective_date") ?? "");

  if (!userId) fail("Choose an employee.");
  if (!Number.isFinite(rate) || rate < 0) fail("Enter a valid rate.");
  if (!effectiveDate) fail("Choose an effective date.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bill_rates")
    .insert({ user_id: userId, rate, effective_date: effectiveDate });

  if (error) {
    fail(
      error.code === "23505"
        ? "A bill rate already exists for that employee on that date."
        : error.message
    );
  }

  revalidatePath("/business");
  succeed();
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
