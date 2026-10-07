"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/format";
import type { CommitResponse, PreviewResponse } from "@/server/services/import";
import { useTRPC } from "./trpc";

async function postFile<T>(mode: "preview" | "commit", file: File): Promise<T> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api/import?mode=${mode}`, { method: "POST", body: form });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body !== null && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "The upload failed.";
    throw new Error(message);
  }
  return body as T;
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (file: File) => postFile<PreviewResponse>("preview", file),
    onError: (error) => toast.error(error.message),
  });
}

function filenameFrom(response: Response, fallback: string): string {
  const match = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export async function downloadImportTemplate(format: "csv" | "xlsx"): Promise<void> {
  try {
    const response = await fetch(`/api/import/template?format=${format}`);
    if (!response.ok) throw new Error(`Failed to download the ${format.toUpperCase()} template.`);
    const blob = await response.blob();
    const filename = filenameFrom(response, `template.${format}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "The download failed.");
  }
}

// Everything on screen may have changed after an import, undo, or clear.
export function useImportCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => postFile<CommitResponse>("commit", file),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(`Imported ${formatNumber(data.validRows)} rows`, {
        description: `${formatNumber(data.summary.logsCreated)} new, ${formatNumber(data.summary.logsUpdated)} updated, ${formatNumber(data.summary.logsUnchanged)} already there.`,
      });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useImportHistory() {
  const trpc = useTRPC();
  return useQuery(trpc.import.history.queryOptions());
}

export function useUndoImport() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.import.undo.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Import undone");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useClearAllData() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.import.clearAll.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        const total = Object.values(data.removed).reduce((sum, count) => sum + count, 0);
        toast.success(`Cleared ${formatNumber(total)} rows`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
}
