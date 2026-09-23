import type { ReactNode } from "react";
import { Gelasio } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/sidebar-nav";

const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gelasio",
});

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={gelasio.variable}>
      <body>
        <div className="flex min-h-screen">
          <SidebarNav />
          <div className="flex-1 overflow-x-hidden">{children}</div>
        </div>
      </body>
    </html>
  );
}