import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface CurrentUser {
  user: User;
  role: Role;
  fullName: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile for", user.id, error);
    // Signing out clears the broken session so the login page doesn't just
    // redirect straight back here in a loop — and treating this as a hard
    // failure (rather than quietly defaulting to "employee") is what
    // surfaced the last two bugs here instead of hiding them.
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("We couldn't verify your account. Please sign in again.")}`
    );
  }

  const role: Role = profile?.role === "admin" ? "admin" : "employee";
  return { user, role, fullName: profile?.full_name ?? null };
}
