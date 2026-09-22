"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, logout } from "@/lib/user-session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Nav() {
  const { user, loading } = useSession({ redirectOnUnauthorized: false });
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <nav className="flex h-16 items-center justify-between border-b border-neutral-100 px-6">
      <Link href="/" className="text-lg text-neutral-900">
        RV Skills LMS
      </Link>

      {loading ? null : user ? (
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-neutral-900 hover:text-primary-700">
            Dashboard
          </Link>
          <Link href="/catalog" className="text-sm text-neutral-900 hover:text-primary-700">
            Catalog
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2"
            >
              <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-100 bg-white py-1 shadow-sm">
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
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-neutral-900 hover:text-primary-700">
            Login
          </Link>
          <Link href="/register">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}