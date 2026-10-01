import type { Metadata } from "next";
import { TrendsView } from "@/views/TrendsView";

export const metadata: Metadata = { title: "Trends" };

export default function Page() {
  return <TrendsView />;
}
