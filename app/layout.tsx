import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JTMK e-Quarantine",
  description: "COVID-19 quarantine tracking for JTMK, POLIMAS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
