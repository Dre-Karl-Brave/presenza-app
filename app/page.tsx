import type { Metadata } from "next";
import { DashboardView } from "@/views/DashboardView";

export const metadata: Metadata = { title: { absolute: "Dashboard | Presenza" } };

export default function Page() {
  return <DashboardView />;
}
