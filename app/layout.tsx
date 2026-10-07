import { Suspense } from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/PageContainer";
import { LoadingState } from "@/components/StateView";
import { Providers } from "@/lib/trpc";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Presenza", template: "%s | Presenza" },
  description: "Presenza: an attendance analytics system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <NavBar />
          </Suspense>
          <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 py-6">
            <Suspense fallback={<LoadingState />}>
              <PageContainer>{children}</PageContainer>
            </Suspense>
          </main>
          <footer className="py-4 text-center text-xs text-muted-foreground/50">
            Synthetic data only — no real student information is stored.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
