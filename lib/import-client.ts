"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useMutation({ mutationFn: (file: File) => postFile<PreviewResponse>("preview", file) });
}

// Everything on screen may have changed after an import, undo, or clear.
export function useImportCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => postFile<CommitResponse>("commit", file),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useImportHistory() {
  const trpc = useTRPC();
  return useQuery(trpc.import.history.queryOptions());
}

export function useUndoImport() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(trpc.import.undo.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
}

export function useClearAllData() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(trpc.import.clearAll.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
}
