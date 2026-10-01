"use client";

import { useState } from "react";
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
    <section className="card card--danger">
      <h2 className="card__title">Clear all data</h2>
      <p className="card__description">
        Removes every record from Presenza: attendance, students, subjects, sections, schedules, terms and the import
        history. Nothing is permanently erased from the database, but the system will look empty. Import a file to fill
        it again.
      </p>
      <div className="card__body stack">
        <label className="field">
          <span className="field__label">Type {CONFIRM_WORD} to confirm</span>
          <input
            className="input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="button button--danger"
            disabled={typed !== CONFIRM_WORD || clear.isPending}
            onClick={() => clear.mutate({ confirm: CONFIRM_WORD }, { onSuccess: () => setTyped("") })}
          >
            {clear.isPending ? "Clearing…" : "Clear all data"}
          </button>
        </div>
        {clear.isError ? <div className="notice notice--danger">{clear.error.message}</div> : null}
        {clear.data ? (
          <div className="notice notice--success">Cleared {formatNumber(removedTotal)} rows. The system is now empty.</div>
        ) : null}
      </div>
    </section>
  );
}
