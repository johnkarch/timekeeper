"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import type { Role } from "@/lib/types";

const links: { href: string; label: string; roles: Role[] }[] = [
  { href: "/weekly", label: "Week Overview", roles: ["employee", "admin"] },
  { href: "/monthly", label: "Month Overview", roles: ["admin"] },
  { href: "/jobs", label: "Jobs", roles: ["admin"] },
];

export default function Nav({
  email,
  fullName,
  role,
}: {
  email: string;
  fullName: string | null;
  role: Role;
}) {
  const pathname = usePathname();

  return (
    <header className="bg-teal-500">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1">
          {links
            .filter((link) => link.roles.includes(role))
            .map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-white text-teal-700" : "text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/90">{fullName || email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
