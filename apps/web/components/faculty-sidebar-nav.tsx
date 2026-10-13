"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, logout } from "@/lib/user-session";
import { Avatar } from "@/components/ui/avatar";
import { getPendingSummary } from "@/lib/grading";

const LINKS = [
  { href: "/faculty", label: "My Courses" },
  { href: "/faculty/grading", label: "Grading" },
];

// Same threshold as the Grading page.
const OVERDUE_MS = 3 * 24 * 60 * 60 * 1000;

// How many attempts are waiting to be marked, and whether any is overdue.
// Refreshes on navigation and whenever the Grading page saves marks.
function useGradingCount(enabled: boolean) {
  const pathname = usePathname();
  const [count, setCount] = useState<{ waiting: number; overdue: boolean } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () =>
      Promise.resolve()
        .then(() => getPendingSummary())
        .then((s) => {
          if (cancelled || !Array.isArray(s)) return;
          setCount({
            waiting: s.reduce((n, x) => n + x.waiting, 0),
            overdue: s.some(
              (x) => x.oldest_submitted_at && Date.now() - new Date(x.oldest_submitted_at).getTime() > OVERDUE_MS
            ),
          });
        })
        .catch(() => {}); // the badge is a hint; never break the sidebar over it
    load();
    window.addEventListener("grading-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("grading-changed", load);
    };
  }, [enabled, pathname]);

  return count;
}

export function FacultySidebarNav() {
  const { user, loading } = useSession({ redirectOnUnauthorized: false });
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const grading = useGradingCount(!loading && Boolean(user));

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col self-start border-r border-neutral-100 px-6 py-8">
      <Link href="/faculty" className="text-lg text-neutral-900">
        RV Skills Faculty
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const badge = link.href === "/faculty/grading" && grading && grading.waiting > 0 ? grading : null;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-md px-4 py-2.5 text-sm ${
                active
                  ? "bg-primary-500 text-white"
                  : "text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              {link.label}
              {badge && (
                <span
                  title={badge.overdue ? "Some have waited more than 3 days" : `${badge.waiting} waiting to be marked`}
                  className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-center text-xs ${
                    badge.overdue ? "bg-danger text-white" : active ? "bg-white text-primary-700" : "bg-primary-500 text-white"
                  }`}
                >
                  {badge.waiting > 99 ? "99+" : badge.waiting}
                </span>
              )}
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
