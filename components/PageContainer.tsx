"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      {children}
    </motion.div>
  );
}
