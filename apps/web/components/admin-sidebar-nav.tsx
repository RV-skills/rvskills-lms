"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, logout } from "@/lib/user-session";
import { Avatar } from "@/components/ui/avatar";

const LINKS = [
  { href: "/admin/users", label: "Users" },
];

export function AdminSidebarNav() {
  const { user, loading } = useSession({ redirectOnUnauthorized: false });
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-neutral-100 px-6 py-8">
      <Link href="/admin/users" className="text-lg text-neutral-900">
        RV Skills Admin
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-4 py-2.5 text-sm ${
                active
                  ? "bg-primary-500 text-white"
                  : "text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {!loading && user && (
        <div className="relative mt-auto">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-neutral-100"
          >
            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
            <span className="text-sm text-neutral-900">{user.first_name}</span>
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-52 rounded-md border border-neutral-100 bg-white py-1 shadow-card">
              <div className="border-b border-neutral-100 px-4 py-2">
                <p className="text-sm text-neutral-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-neutral-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-100"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}