"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, LockOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessageFor } from "@/lib/gateway-client";
import {
  getCourseSchedule,
  setModuleOffset,
  createBatch,
  updateBatch,
  deleteBatch,
  setBatchModuleDate,
  clearBatchModuleDate,
  setStudentBatch,
  todayInIndia,
  formatDay,
  type CourseSchedule,
  type ScheduleBatch,
} from "@/lib/batches";

const input = "rounded-md border border-neutral-100 px-3 py-2 text-sm";

// Release schedule and batches for one course. Faculty and admins both use it.
// The course holds one schedule ("Module 2 opens on day 14"); each batch turns that
// into real dates from its own start date, and can move single modules earlier or later.
export function ScheduleManager({ courseId }: { courseId: string }) {
  const [schedule, setSchedule] = useState<CourseSchedule | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getCourseSchedule(courseId)
      .then(setSchedule)
      .catch((err) => {
        setSchedule(null);
        setError(errorMessageFor(err, "Couldn't load batches for this course."));
      });
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs a change, shows any error, then reloads so every date on screen is the server's.
  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessageFor(err, fallback));
    } finally {
      setBusy(false);
      load();
    }
  }

  if (schedule === undefined) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }
  if (schedule === null) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-xs text-neutral-500">Batches and release schedule</p>
        <h1 className="mt-1 text-xl text-neutral-900">{schedule.courseTitle}</h1>
      </div>

      {error && <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <OffsetsSection schedule={schedule} busy={busy} run={run} courseId={courseId} />
      <BatchesSection schedule={schedule} busy={busy} run={run} courseId={courseId} />
      <StudentsSection schedule={schedule} busy={busy} run={run} courseId={courseId} />
    </div>
  );
}

type SectionProps = {
  courseId: string;
  schedule: CourseSchedule;
  busy: boolean;
  run: (action: () => Promise<void>, fallback: string) => Promise<void>;
};

function OffsetsSection({ courseId, schedule, busy, run }: SectionProps) {
  const saved = () => Object.fromEntries(schedule.modules.map((m) => [m.module_id, String(m.unlock_after_days)]));
  const [days, setDays] = useState<Record<string, string>>(saved);

  useEffect(() => {
    setDays(Object.fromEntries(schedule.modules.map((m) => [m.module_id, String(m.unlock_after_days)])));
  }, [schedule]);

  const changed = schedule.modules.filter((m) => days[m.module_id] !== String(m.unlock_after_days));
  const invalid = changed.some((m) => !/^\d+$/.test(days[m.module_id] ?? ""));

  return (
    <section>
      <h2 className="text-base text-neutral-900">Release schedule</h2>
      <p className="mt-1 text-sm text-neutral-500">
        When each module opens, counted from the day a batch starts. Day 0 opens on the start date.
      </p>
      {schedule.modules.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">This course has no modules yet.</p>
      ) : (
        <>
          <table className="mt-4 w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="py-2 font-medium text-neutral-500">Module</th>
                <th className="py-2 font-medium text-neutral-500">Opens on day</th>
              </tr>
            </thead>
            <tbody>
              {schedule.modules.map((m, i) => (
                <tr key={m.module_id} className="border-b border-neutral-100">
                  <td className="py-2 text-neutral-900">
                    {i + 1}. {m.title}
                  </td>
                  <td className="py-2">
                    <input
                      aria-label={`Opens on day, ${m.title}`}
                      inputMode="numeric"
                      value={days[m.module_id] ?? ""}
                      onChange={(e) => setDays({ ...days, [m.module_id]: e.target.value.trim() })}
                      className={`${input} w-24`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-3">
            <Button
              size="sm"
              disabled={busy || changed.length === 0 || invalid}
              onClick={() =>
                run(async () => {
                  for (const m of changed) {
                    await setModuleOffset(courseId, m.module_id, Number(days[m.module_id]));
                  }
                }, "Couldn't save the schedule.")
              }
            >
              Save schedule
            </Button>
            {invalid && <span className="text-xs text-danger">Use whole days, 0 or more.</span>}
          </div>
        </>
      )}
    </section>
  );
}

function BatchesSection({ courseId, schedule, busy, run }: SectionProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <section>
      <h2 className="text-base text-neutral-900">Batches</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Students see the whole course, but a module stays locked until its date for their batch. Students who join
        late get every module that has already opened.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nov 2026" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Starts
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Ends (optional)
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
        </label>
        <Button
          size="sm"
          disabled={busy || !name.trim() || !start}
          onClick={() =>
            run(async () => {
              await createBatch(courseId, { name: name.trim(), start_date: start, end_date: end || null });
              setName("");
              setStart("");
              setEnd("");
            }, "Couldn't create the batch.")
          }
        >
          Add batch
        </Button>
      </div>

      {schedule.batches.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">No batches yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {schedule.batches.map((b) => (
            <BatchCard key={b.batch_id} batch={b} courseId={courseId} schedule={schedule} busy={busy} run={run} />
          ))}
        </div>
      )}
    </section>
  );
}

function BatchCard({ batch, courseId, schedule, busy, run }: SectionProps & { batch: ScheduleBatch }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(batch.name);
  const [start, setStart] = useState(batch.start_date);
  const [end, setEnd] = useState(batch.end_date ?? "");
  const today = todayInIndia();

  return (
    <div className="rounded-lg border border-neutral-100 p-4">
      {editing ? (
        <div className="flex flex-wrap items-end gap-3">
          <input aria-label="Batch name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <input aria-label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
          <input aria-label="End date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
          <Button
            size="sm"
            disabled={busy || !name.trim() || !start}
            onClick={() =>
              run(async () => {
                await updateBatch(courseId, batch.batch_id, { name: name.trim(), start_date: start, end_date: end || null });
                setEditing(false);
              }, "Couldn't update the batch.")
            }
          >
            Save
          </Button>
          <button onClick={() => setEditing(false)} className="text-sm text-neutral-500">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h3 className="text-sm font-medium text-neutral-900">{batch.name}</h3>
          <span className="text-xs text-neutral-500">
            {formatDay(batch.start_date)}
            {batch.end_date ? ` to ${formatDay(batch.end_date)}` : ""} · {batch.student_count} student
            {batch.student_count !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setEditing(true)} className="text-xs text-primary-700 hover:underline">
            Edit
          </button>
          <button
            onClick={() => run(() => deleteBatch(courseId, batch.batch_id), "Couldn't delete the batch.")}
            disabled={busy}
            aria-label={`Delete ${batch.name}`}
            className="ml-auto text-neutral-500 hover:text-danger disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="py-2 font-medium text-neutral-500">Module</th>
            <th className="py-2 font-medium text-neutral-500">Opens</th>
            <th className="py-2 font-medium text-neutral-500"></th>
          </tr>
        </thead>
        <tbody>
          {schedule.modules.map((m, i) => {
            const d = batch.modules.find((x) => x.module_id === m.module_id);
            if (!d) return null;
            return (
              <tr key={m.module_id} className="border-b border-neutral-100">
                <td className="py-2 text-neutral-900">
                  {i + 1}. {m.title}
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    {d.is_open ? <LockOpen size={14} className="text-success" /> : <Lock size={14} className="text-neutral-500" />}
                    <DateCell
                      label={`Opening date, ${m.title}`}
                      value={d.unlock_date}
                      disabled={busy}
                      onSave={(day) =>
                        run(() => setBatchModuleDate(courseId, batch.batch_id, m.module_id, day), "Couldn't change the date.")
                      }
                    />
                    {d.overridden && <span className="text-xs text-neutral-500">changed for this batch</span>}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {!d.is_open && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => setBatchModuleDate(courseId, batch.batch_id, m.module_id, today), "Couldn't unlock the module.")
                      }
                      className="text-xs text-primary-700 hover:underline disabled:opacity-50"
                    >
                      Unlock now
                    </button>
                  )}
                  {d.overridden && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => clearBatchModuleDate(courseId, batch.batch_id, m.module_id), "Couldn't reset the date.")
                      }
                      className="ml-3 text-xs text-neutral-500 hover:underline disabled:opacity-50"
                    >
                      Use schedule
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Saves when the field loses focus, so typing a date doesn't send one request per keystroke.
function DateCell({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onSave: (day: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      aria-label={label}
      type="date"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft && draft !== value) onSave(draft);
        else setDraft(value);
      }}
      className={`${input} py-1`}
    />
  );
}

function StudentsSection({ courseId, schedule, busy, run }: SectionProps) {
  const unassigned = schedule.students.filter((s) => !s.batch_id).length;

  return (
    <section>
      <h2 className="text-base text-neutral-900">Students</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Students without a batch follow the old rule: each module opens once the one before it is finished. Moving a
        student between batches keeps their progress.
      </p>
      {schedule.students.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Nobody is enrolled yet.</p>
      ) : (
        <>
          {unassigned > 0 && schedule.batches.length > 0 && (
            <p className="mt-3 text-xs text-neutral-500">
              {unassigned} student{unassigned !== 1 ? "s" : ""} not in a batch.
            </p>
          )}
          <table className="mt-4 w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="py-2 font-medium text-neutral-500">Student</th>
                <th className="py-2 font-medium text-neutral-500">Batch</th>
              </tr>
            </thead>
            <tbody>
              {schedule.students.map((s) => (
                <tr key={s.enrollment_id} className="border-b border-neutral-100">
                  <td className="py-2 text-neutral-900">
                    {s.name}
                    {s.username && <span className="ml-2 text-xs text-neutral-500">@{s.username}</span>}
                  </td>
                  <td className="py-2">
                    <select
                      aria-label={`Batch for ${s.name}`}
                      value={s.batch_id ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        run(() => setStudentBatch(courseId, s.enrollment_id, e.target.value || null), "Couldn't move the student.")
                      }
                      className={`${input} py-1`}
                    >
                      <option value="">No batch</option>
                      {schedule.batches.map((b) => (
                        <option key={b.batch_id} value={b.batch_id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
