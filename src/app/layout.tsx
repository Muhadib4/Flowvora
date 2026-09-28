import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/providers/app-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Flowvora", template: "%s | Flowvora" },
  description: "A calm, local-first workspace for organizing work, maintaining focus, and keeping momentum visible.",
  applicationName: "Flowvora",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-noise min-h-full"><a href="#main-content" className="sr-only-focusable">Skip to content</a><AppProvider>{children}</AppProvider></body>
    </html>
  );
}
