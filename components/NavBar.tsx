"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/comparisons", label: "Comparisons" },
  { href: "/reports", label: "Reports" },
  { href: "/import", label: "Import" },
];

export function NavBar() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-[11px] font-bold"
            aria-hidden="true"
          >
            P
          </span>
          <span className="font-bold text-[1.1rem] tracking-tight">Presenza</span>
        </Link>

        <nav className="flex items-center gap-0.5" aria-label="Main">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={query ? `${link.href}?${query}` : link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
