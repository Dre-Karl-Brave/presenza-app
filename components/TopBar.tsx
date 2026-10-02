"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_NAMES: Array<{ href: string; label: string }> = [
  { href: "/trends", label: "Trends" },
  { href: "/comparisons", label: "Comparisons" },
  { href: "/reports", label: "Reports" },
  { href: "/import", label: "Import" },
  { href: "/", label: "Dashboard" },
];

export function TopBar() {
  const pathname = usePathname();
  const page =
    PAGE_NAMES.find((p) =>
      p.href === "/" ? pathname === "/" : pathname.startsWith(p.href)
    ) ?? { label: "Dashboard" };

  return (
    <header className="h-[52px] bg-card border-b border-border flex items-center px-5 gap-3 shrink-0 sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 md:hidden text-muted-foreground hover:text-foreground" />
      <div className="flex items-center gap-[6px] flex-1 min-w-0">
        <span className="text-[12px] text-muted-foreground font-medium whitespace-nowrap">
          Presenza
        </span>
        <span className="text-muted-foreground/30 text-[14px] font-light">/</span>
        <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
          {page.label}
        </span>
      </div>
    </header>
  );
}
