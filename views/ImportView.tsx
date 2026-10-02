"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { LoadingState, ErrorState } from "@/components/StateView";
import { formatNumber } from "@/lib/format";
import { useImportCommit, useImportPreview } from "@/lib/import-client";
import { cn } from "@/lib/utils";
import type { ImportError } from "@/server/services/import";
import { ClearAllCard } from "./ClearAllCard";
import { ImportHistory } from "./ImportHistory";

const errorCols: Column<ImportError>[] = [
  { key: "row", header: "Row", numeric: true, render: (e) => e.row },
  { key: "col", header: "Column", render: (e) => e.column ?? "—" },
  { key: "msg", header: "Problem", render: (e) => e.message },
];

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[6px] overflow-hidden">
      <div className="px-[18px] py-[13px] border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        {sub ? <span className="text-[12px] text-muted-foreground ml-2">{sub}</span> : null}
      </div>
      <div className="p-[18px]">{children}</div>
    </div>
  );
}

export function ImportView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) choose(dropped);
  }

  const previewData = preview.data;
  const sampleCols: Column<Record<string, string>>[] = previewData
    ? Object.keys(previewData.sample[0] ?? {}).map((key) => ({
        key, header: key, render: (row) => row[key] ?? "",
      }))
    : [];

  return (
    <>
      {/* 1. Template */}
      <Section title="1. Get the template" sub="one row per student per class meeting">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-7 text-[12.5px] rounded-[5px]" asChild>
            <a href="/api/import/template?format=csv" download>Download CSV</a>
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[12.5px] rounded-[5px]" asChild>
            <a href="/api/import/template?format=xlsx" download>Download XLSX</a>
          </Button>
        </div>
      </Section>

      {/* 2. Upload */}
      <Section title="2. Choose a file" sub=".csv or .xlsx, up to 10 MB">
        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-[6px] border-2 border-dashed p-10 text-center cursor-pointer transition-colors duration-150",
            dragging
              ? "border-primary bg-accent/30 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:bg-secondary/40"
          )}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <Upload className={cn("w-8 h-8 transition-colors", dragging ? "text-primary" : "opacity-30")} strokeWidth={1.5} />
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {dragging ? "Drop it here" : "Drop a file or click to browse"}
            </p>
            <p className="text-[12px] mt-0.5">.csv or .xlsx — up to 10 MB</p>
          </div>
          {file ? (
            <div className="flex items-center gap-2 text-[12px] font-medium text-foreground bg-secondary border border-border rounded-[5px] px-3 py-1">
              <FileText className="w-3.5 h-3.5" />
              {file.name}
            </div>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
          onChange={(e) => choose(e.target.files?.[0] ?? null)} />
      </Section>

      {preview.isPending ? (
        <div className="bg-card border border-border rounded-[6px] p-6">
          <LoadingState label="Reading and checking the file…" />
        </div>
      ) : null}

      {preview.isError ? (
        <div className="bg-card border border-border rounded-[6px] p-6">
          <ErrorState message={preview.error.message} />
        </div>
      ) : null}

      {previewData && !commit.data ? (
        <Section title={`3. Preview: ${previewData.fileName}`} sub="nothing saved yet">
          <div className="flex flex-col gap-[14px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-[14px]">
              <StatCard label="Rows read" value={formatNumber(previewData.rowsRead)} />
              <StatCard label="Valid rows" value={formatNumber(previewData.validRows)} />
              <StatCard label="Invalid rows" value={formatNumber(previewData.invalidRows)} hint="Skipped" />
              <StatCard label="New records" value={formatNumber(previewData.summary.logsCreated)} />
              <StatCard label="Updated" value={formatNumber(previewData.summary.logsUpdated)} />
              <StatCard label="Unchanged" value={formatNumber(previewData.summary.logsUnchanged)} />
            </div>

            <p className="text-[12.5px] text-muted-foreground">
              This would also create {formatNumber(previewData.summary.studentsCreated)} students,{" "}
              {formatNumber(previewData.summary.subjectsCreated)} subjects,{" "}
              {formatNumber(previewData.summary.sectionsCreated)} sections,{" "}
              {formatNumber(previewData.summary.classesCreated)} classes and{" "}
              {formatNumber(previewData.summary.sessionsCreated)} sessions
              {previewData.summary.revived > 0 ? `, and bring back ${formatNumber(previewData.summary.revived)} removed rows` : ""}.
            </p>

            {previewData.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold">Problems found</p>
                <p className="text-[12px] text-muted-foreground">
                  {previewData.errorsTruncated ? "Showing the first 200. " : ""}
                  Fix them and choose the file again, or import only the valid rows.
                </p>
                <DataTable columns={errorCols} rows={previewData.errors}
                  rowKey={(e) => `${e.row}-${e.column}-${e.message}`} status="ready" />
              </div>
            ) : null}

            {previewData.sample.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold">First rows</p>
                <DataTable columns={sampleCols} rows={previewData.sample}
                  rowKey={(row) => JSON.stringify(row)} status="ready" />
              </div>
            ) : null}

            {commit.isError ? (
              <div className="text-[12.5px] text-destructive bg-destructive/8 rounded-[5px] px-4 py-2">
                {commit.error.message}
              </div>
            ) : null}

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-7 text-[12.5px] rounded-[5px]"
                disabled={previewData.validRows === 0 || commit.isPending || !file}
                onClick={() => file && commit.mutate(file)}
              >
                {commit.isPending ? "Importing…" : `Import ${formatNumber(previewData.validRows)} valid rows`}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[12.5px] rounded-[5px]"
                onClick={reset} disabled={commit.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      {commit.data ? (
        <div className="bg-card border border-border rounded-[6px] p-[18px] space-y-4">
          <p className="text-[12.5px] text-[#16a34a] bg-[#16a34a]/8 rounded-[5px] px-4 py-2">
            Imported {formatNumber(commit.data.validRows)} rows:{" "}
            {formatNumber(commit.data.summary.logsCreated)} new,{" "}
            {formatNumber(commit.data.summary.logsUpdated)} updated,{" "}
            {formatNumber(commit.data.summary.logsUnchanged)} already there.
            {commit.data.invalidRows > 0 ? ` ${formatNumber(commit.data.invalidRows)} invalid rows skipped.` : ""}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-[12.5px] rounded-[5px]" asChild>
              <Link href="/">View dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[12.5px] rounded-[5px]" onClick={reset}>
              Import another file
            </Button>
          </div>
        </div>
      ) : null}

      <ImportHistory />
      <ClearAllCard />
    </>
  );
}
