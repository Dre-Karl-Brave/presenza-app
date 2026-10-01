import type { Metadata } from "next";
import { ComparisonsView } from "@/views/ComparisonsView";

export const metadata: Metadata = { title: "Comparisons" };

export default function Page() {
  return <ComparisonsView />;
}
