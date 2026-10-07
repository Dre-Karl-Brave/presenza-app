"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  ClipboardList,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/comparisons", label: "Comparisons", icon: BarChart2 },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/import", label: "Import", icon: Upload },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function CollapseToggle() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex items-center gap-[7px] h-8 mx-[7px] px-[9px] rounded-[5px] border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors shrink-0"
    >
      <div className="flex flex-col gap-[3px] w-[14px] shrink-0">
        <div className="h-[1.5px] bg-current rounded-sm" />
        <div className="h-[1.5px] bg-current rounded-sm w-[10px]" />
        <div className="h-[1.5px] bg-current rounded-sm" />
      </div>
      <span className="text-[12px] font-medium group-data-[collapsible=icon]:hidden">
        Collapse
      </span>
    </button>
  );
}

function NavLinks() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  return (
    <SidebarMenu>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        const dest = query ? `${href}?${query}` : href;
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={{ children: label, side: "right" }}
            >
              <Link href={dest} aria-current={active ? "page" : undefined}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  return (
    <Sidebar side="left" collapsible="icon">
      {/* Brand */}
      <SidebarHeader className="h-[52px] border-b border-sidebar-border flex-row items-center gap-[9px] px-[14px] overflow-hidden">
        {/* Two overlapping squares */}
        <div className="relative w-[22px] h-[22px] shrink-0">
          <div className="absolute top-0 left-0 w-[14px] h-[14px] bg-sidebar-primary rounded-[3px]" />
          <div className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-sidebar-foreground rounded-[2px]" />
        </div>
        <span className="font-bold text-[15px] tracking-[-0.5px] text-sidebar-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">
          Presenza
        </span>
      </SidebarHeader>

      {/* Collapse toggle */}
      <div className="py-[5px] shrink-0">
        <CollapseToggle />
      </div>

      {/* Section label */}
      <div className="px-[10px] pb-1 overflow-hidden shrink-0">
        <span className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-[0.7px] group-data-[collapsible=icon]:hidden">
          Workspace
        </span>
      </div>

      {/* Nav */}
      <SidebarContent className="px-[7px]">
        <Suspense fallback={null}>
          <NavLinks />
        </Suspense>
      </SidebarContent>

      {/* Footer */}
      <SidebarSeparator className="bg-sidebar-border" />
      <SidebarFooter className="p-0 overflow-hidden">
        <div className="flex items-center gap-[9px] px-[14px] py-[11px] overflow-hidden">
          <div className="w-[26px] h-[26px] bg-sidebar-foreground/10 rounded-[5px] flex items-center justify-center shrink-0 border border-sidebar-border">
            <span className="text-sidebar-foreground text-[11px] font-bold">
              P
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-sidebar-foreground truncate">
              Presenza
            </div>
            <div className="text-[11px] text-sidebar-foreground/40">© 2026</div>
          </div>
          <ThemeToggle className="shrink-0 group-data-[collapsible=icon]:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
