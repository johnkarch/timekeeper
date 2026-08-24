import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Nav from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav email={current.user.email ?? ""} fullName={current.fullName} role={current.role} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
