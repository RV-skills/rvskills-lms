import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/nav";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}