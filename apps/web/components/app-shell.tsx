"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { SidebarNav } from "./sidebar-nav";

const ALWAYS_PUBLIC_PATHS = ["/", "/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useSession({ redirectOnUnauthorized: false });

  const alwaysPublic = ALWAYS_PUBLIC_PATHS.includes(pathname);
  const showSidebar = !alwaysPublic && !loading && !!user;

  if (!showSidebar) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}