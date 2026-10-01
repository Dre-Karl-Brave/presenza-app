import type { Metadata } from "next";
import { ImportView } from "@/views/ImportView";

export const metadata: Metadata = { title: "Import" };

export default function Page() {
  return <ImportView />;
}
