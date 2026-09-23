import type { ReactNode } from "react";
import { Gelasio } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}