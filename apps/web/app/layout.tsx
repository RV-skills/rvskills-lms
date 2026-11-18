import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Gelasio } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gelasio",
});

export const metadata: Metadata = {
  title: { default: "RV-SKILLS", template: "%s | RV-SKILLS" },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
};

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