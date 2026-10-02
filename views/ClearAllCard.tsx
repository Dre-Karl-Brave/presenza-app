"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { useClearAllData } from "@/lib/import-client";

const CONFIRM_WORD = "CLEAR";

export function ClearAllCard() {
  const [typed, setTyped] = useState("");
  const clear = useClearAllData();

  const removedTotal = clear.data
    ? Object.values(clear.data.removed).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div className="bg-card border border-destructive/30 rounded-[6px] overflow-hidden">
      <div className="px-[18px] py-[13px] border-b border-border">
        <span className="text-[13px] font-semibold text-destructive">Clear all data</span>
        <span className="text-[12px] text-muted-foreground ml-2">removes every record — nothing is permanently deleted</span>
      </div>
      <div className="p-[18px] flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.5px]">
            Type {CONFIRM_WORD} to confirm
          </span>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-7 w-[160px] text-[12.5px] rounded-[5px]"
          />
        </div>
        <div>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-[12.5px] rounded-[5px]"
            disabled={typed !== CONFIRM_WORD || clear.isPending}
            onClick={() => clear.mutate({ confirm: CONFIRM_WORD }, { onSuccess: () => setTyped("") })}
          >
            {clear.isPending ? "Clearing…" : "Clear all data"}
          </Button>
        </div>
        {clear.isError ? (
          <p className="text-[12px] text-destructive">{clear.error.message}</p>
        ) : null}
        {clear.data ? (
          <p className="text-[12.5px] text-[#16a34a]">
            Cleared {formatNumber(removedTotal)} rows. The system is now empty.
          </p>
        ) : null}
      </div>
    </div>
  );
}
