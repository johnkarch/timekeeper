"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email.")}`);
  }

  const host = (await headers()).get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    console.error("resetPasswordForEmail failed:", error);

    // Rate limiting doesn't reveal whether the email has an account, so it's
    // safe (and much less confusing) to surface this one honestly instead of
    // behind the generic success message below.
    if (error.code === "over_email_send_rate_limit") {
      redirect(
        `/forgot-password?error=${encodeURIComponent(
          "Too many reset requests right now — wait a bit and try again."
        )}`
      );
    }
  }

  // Every other outcome (including "no account with that email," which
  // Supabase itself never distinguishes) shows the same success message, so
  // this page can't be used to check which emails have accounts.
  redirect("/forgot-password?success=1");
}
