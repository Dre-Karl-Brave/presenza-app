import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { LoadingState } from "@/components/StateView";
import { Providers } from "@/lib/trpc";
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
  title: { default: "Presenza", template: "%s | Presenza" },
  description: "Presenza: an attendance analytics system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <NavBar />
          </Suspense>
          <main className="app-main">
            <Suspense fallback={<LoadingState />}>{children}</Suspense>
          </main>
          <footer className="app-footer">
            Presenza uses synthetic data only. No real student information is stored.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
