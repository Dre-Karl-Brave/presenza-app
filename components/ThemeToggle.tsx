"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("shrink-0", className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={
        mounted
          ? resolvedTheme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle theme"
      }
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
