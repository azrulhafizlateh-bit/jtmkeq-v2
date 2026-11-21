import type { Metadata } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import "./globals.css";

const overpass = Overpass({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-overpass",
});

const overpassMono = Overpass_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-overpass-mono",
});

export const metadata: Metadata = {
  title: "JTMK e-Quarantine",
  description: "COVID-19 quarantine tracking for JTMK, POLIMAS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${overpass.variable} ${overpassMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
