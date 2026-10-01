"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/StateView";
import { StatCard } from "@/components/StatCard";
import { formatNumber } from "@/lib/format";
import { useImportCommit, useImportPreview } from "@/lib/import-client";
import type { ImportError } from "@/server/services/import";
import { ClearAllCard } from "./ClearAllCard";
import { ImportHistory } from "./ImportHistory";

const errorColumns: Column<ImportError>[] = [
  { key: "row", header: "Row", numeric: true, render: (error) => error.row },
  { key: "column", header: "Column", render: (error) => error.column ?? "n/a" },
  { key: "message", header: "Problem", render: (error) => error.message },
];

function TemplateCard() {
  return (
    <section className="card">
      <h2 className="card__title">1. Get the template</h2>
      <p className="card__description">
        One row per student per class meeting. Required columns: student number, student name, subject code, section,
        date, time in, time out, status. Optional: class start and class end (when the class meets).
      </p>
      <div className="card__body button-row">
        <a className="button" href="/api/import/template?format=csv" download>
          Download CSV template
        </a>
        <a className="button" href="/api/import/template?format=xlsx" download>
          Download XLSX template
        </a>
      </div>
    </section>
  );
}

export function ImportView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const preview = useImportPreview();
  const commit = useImportCommit();

  function choose(selected: File | null) {
    setFile(selected);
    commit.reset();
    preview.reset();
    if (selected) preview.mutate(selected);
  }

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
    choose(null);
  }

  const previewData = preview.data;
  const sampleColumns: Column<Record<string, string>>[] = previewData
    ? Object.keys(previewData.sample[0] ?? {}).map((key) => ({
        key,
        header: key,
        render: (row) => row[key] ?? "",
      }))
    : [];

  return (
    <>
      <PageHeader
        title="Import"
        description="Load attendance from a CSV or XLSX file. Uploading the same file again is safe: nothing is doubled."
      />

      <TemplateCard />

      <section className="card">
        <h2 className="card__title">2. Choose a file</h2>
        <p className="card__description">.csv or .xlsx, up to 10 MB. You will see a preview before anything is saved.</p>
        <div className="card__body">
          <input
            ref={inputRef}
            className="input"
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      {preview.isPending ? (
        <section className="card">
          <LoadingState label="Reading and checking the file…" />
        </section>
      ) : null}

      {preview.isError ? (
        <section className="card">
          <ErrorState message={preview.error.message} />
        </section>
      ) : null}

      {previewData && !commit.data ? (
        <section className="card">
          <h2 className="card__title">3. Preview: {previewData.fileName}</h2>
          <p className="card__description">Nothing has been saved yet.</p>

          <div className="card__body stack">
            <div className="grid grid--stats">
              <StatCard label="Rows read" value={formatNumber(previewData.rowsRead)} />
              <StatCard label="Valid rows" value={formatNumber(previewData.validRows)} />
              <StatCard label="Invalid rows" value={formatNumber(previewData.invalidRows)} hint="These are skipped" />
              <StatCard label="New records" value={formatNumber(previewData.summary.logsCreated)} />
              <StatCard label="Records updated" value={formatNumber(previewData.summary.logsUpdated)} />
              <StatCard label="Already imported" value={formatNumber(previewData.summary.logsUnchanged)} />
            </div>

            <p className="muted">
              This would also create {formatNumber(previewData.summary.studentsCreated)} students,{" "}
              {formatNumber(previewData.summary.subjectsCreated)} subjects,{" "}
              {formatNumber(previewData.summary.sectionsCreated)} sections,{" "}
              {formatNumber(previewData.summary.classesCreated)} classes and{" "}
              {formatNumber(previewData.summary.sessionsCreated)} class sessions
              {previewData.summary.revived > 0 ? `, and bring back ${formatNumber(previewData.summary.revived)} removed rows` : ""}
              .
              {previewData.summary.schedulesInferred > 0
                ? ` ${formatNumber(previewData.summary.schedulesInferred)} class schedules are guessed from the earliest time in, because the file has no class start/end.`
                : ""}
            </p>

            {previewData.errors.length > 0 ? (
              <div>
                <h3 className="card__title">Problems found</h3>
                <p className="muted">
                  {previewData.errorsTruncated ? "Showing the first 200. " : ""}Fix them in the file and choose it
                  again, or import the valid rows and skip these.
                </p>
                <DataTable
                  columns={errorColumns}
                  rows={previewData.errors}
                  rowKey={(error) => `${error.row}-${error.column}-${error.message}`}
                  status="ready"
                />
              </div>
            ) : null}

            {previewData.sample.length > 0 ? (
              <div>
                <h3 className="card__title">First rows</h3>
                <DataTable
                  columns={sampleColumns}
                  rows={previewData.sample}
                  rowKey={(row) => JSON.stringify(row)}
                  status="ready"
                />
              </div>
            ) : null}

            {commit.isError ? <div className="notice notice--danger">{commit.error.message}</div> : null}

            <div className="button-row">
              <button
                type="button"
                className="button button--primary"
                disabled={previewData.validRows === 0 || commit.isPending || !file}
                onClick={() => file && commit.mutate(file)}
              >
                {commit.isPending ? "Importing…" : `Import ${formatNumber(previewData.validRows)} valid rows`}
              </button>
              <button type="button" className="button" onClick={reset} disabled={commit.isPending}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {commit.data ? (
        <section className="card">
          <div className="notice notice--success">
            Imported {formatNumber(commit.data.validRows)} rows: {formatNumber(commit.data.summary.logsCreated)} new,{" "}
            {formatNumber(commit.data.summary.logsUpdated)} updated, {formatNumber(commit.data.summary.logsUnchanged)}{" "}
            already there.
            {commit.data.invalidRows > 0 ? ` ${formatNumber(commit.data.invalidRows)} invalid rows were skipped.` : ""}
          </div>
          <div className="card__actions button-row">
            <Link className="button button--primary" href="/">
              View the dashboard
            </Link>
            <button type="button" className="button" onClick={reset}>
              Import another file
            </button>
          </div>
        </section>
      ) : null}

      <ImportHistory />
      <ClearAllCard />
    </>
  );
}
