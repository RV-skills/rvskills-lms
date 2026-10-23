"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessageFor } from "@/lib/gateway-client";
import type { ScheduleBatch } from "@/lib/batches";
import {
  importRoster,
  parseStudentCsv,
  credentialsCsv,
  type ImportAction,
  type ImportResult,
  type ImportRow,
} from "@/lib/roster-import";

const LABEL: Record<ImportAction, string> = {
  create_and_enrol: "New account + enrol",
  enrol: "Enrol",
  already_enrolled: "Already enrolled",
  error: "Skipped",
};

const TONE: Record<ImportAction, string> = {
  create_and_enrol: "text-primary-700",
  enrol: "text-primary-700",
  already_enrolled: "text-neutral-500",
  error: "text-danger",
};

// Admin only: add students to this course (and a batch) from a CSV. Shows what will happen
// first; nothing is created until the admin confirms.
export function ImportStudents({
  courseId,
  batches,
  onDone,
}: {
  courseId: string;
  batches: ScheduleBatch[];
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [batchId, setBatchId] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setRows(null);
    setResult(null);
    setError(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function preview(nextRows: ImportRow[], nextBatch: string) {
    setBusy(true);
    setError(null);
    try {
      setResult(await importRoster(courseId, { rows: nextRows, batch_id: nextBatch || null, dry_run: true }));
    } catch (err) {
      setResult(null);
      setError(errorMessageFor(err, "Couldn't check the file."));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const parsed = parseStudentCsv(await file.text());
    if (parsed.error) {
      setRows(null);
      setResult(null);
      setError(parsed.error);
      return;
    }
    setRows(parsed.rows);
    await preview(parsed.rows, batchId);
  }

  async function confirm() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await importRoster(courseId, { rows, batch_id: batchId || null, dry_run: false }));
      onDone();
    } catch (err) {
      setError(errorMessageFor(err, "Couldn't add the students."));
    } finally {
      setBusy(false);
    }
  }

  function downloadPasswords() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([credentialsCsv(result)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "new-student-logins.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = result && !result.dry_run;
  const toAdd = result ? result.counts.create_and_enrol + result.counts.enrol : 0;
  const toMove = result && batchId ? result.counts.already_enrolled : 0;
  const newLogins = result?.rows.filter((r) => r.generated_password).length ?? 0;

  return (
    <section>
      <h2 className="text-base text-neutral-900">Add students from CSV</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Columns: first_name, last_name, username, email. Students who don&apos;t have an account get one; everyone is
        enrolled in this course. Username is optional (the part of the email before @ is used).
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Batch
          <select
            aria-label="Batch for imported students"
            value={batchId}
            disabled={busy || !!done}
            onChange={(e) => {
              setBatchId(e.target.value);
              if (rows) preview(rows, e.target.value);
            }}
            className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
          >
            <option value="">No batch</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          CSV file
          <input
            ref={fileRef}
            aria-label="Student CSV file"
            type="file"
            accept=".csv,text/csv"
            disabled={busy || !!done}
            onChange={onFile}
            className="text-sm"
          />
        </label>
        {(rows || error) && (
          <button onClick={reset} className="text-sm text-neutral-500 hover:underline">
            {done ? "Add another file" : "Clear"}
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-4">
          <p className="text-sm text-neutral-900">
            {done ? "Done. " : `${fileName}: `}
            {result.counts.create_and_enrol} new account{result.counts.create_and_enrol !== 1 ? "s" : ""},{" "}
            {result.counts.enrol} existing, {result.counts.already_enrolled} already enrolled
            {result.counts.error > 0 ? `, ${result.counts.error} skipped` : ""}.
          </p>

          <table className="mt-3 w-full max-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="py-2 font-medium text-neutral-500">Row</th>
                <th className="py-2 font-medium text-neutral-500">Student</th>
                <th className="py-2 font-medium text-neutral-500">Email</th>
                <th className="py-2 font-medium text-neutral-500">{done ? "Result" : "Will do"}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.row} className="border-b border-neutral-100">
                  <td className="py-2 text-neutral-500">{r.row}</td>
                  <td className="py-2 text-neutral-900">{r.name || "—"}</td>
                  <td className="py-2 text-neutral-500">{r.email || "—"}</td>
                  <td className={`py-2 ${TONE[r.action]}`}>
                    {done && r.action !== "error" ? (r.action === "already_enrolled" ? "Already enrolled" : "Enrolled") : LABEL[r.action]}
                    {r.action === "already_enrolled" && batchId && !done ? " (moved to batch)" : ""}
                    {r.reason && <span className="block text-xs">{r.reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!done && (
            <Button size="sm" className="mt-4" disabled={busy || toAdd + toMove === 0} onClick={confirm}>
              {toAdd > 0 ? `Confirm & add ${toAdd} student${toAdd !== 1 ? "s" : ""}` : `Confirm & move ${toMove} to batch`}
            </Button>
          )}

          {done && newLogins > 0 && (
            <div className="mt-4 rounded-md bg-primary-100 px-4 py-3 text-sm text-primary-700">
              {newLogins} new account{newLogins !== 1 ? "s were" : " was"} created. Download the logins now: the
              passwords can&apos;t be shown again.
              <Button size="sm" className="ml-3" onClick={downloadPasswords}>
                Download logins (CSV)
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
