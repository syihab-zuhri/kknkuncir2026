import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "kkndesakuncir",
    template: "%s · kkndesakuncir",
  },
  description: "Fondasi aplikasi kehadiran KKN Desa Kuncir 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
