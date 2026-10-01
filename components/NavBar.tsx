"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-brand">
          Presenza
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                // Filters travel with you between pages.
                href={query ? `${link.href}?${query}` : link.href}
                className={active ? "nav__link nav__link--active" : "nav__link"}
                aria-current={active ? "page" : undefined}
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
