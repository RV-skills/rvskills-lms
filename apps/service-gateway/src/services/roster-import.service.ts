import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders, throwForFailedResponse } from "../utils/http-client.util";
import { ValidationError } from "@rv-lms/shared-utils";
import { adminBatchCreateStudents } from "./users.service";

// Bulk enrolment from a CSV: create accounts for new students, then enrol everyone in the
// course and, optionally, a batch. The web app sends the rows twice: first with
// dry_run (to show what will happen), then for real once the admin confirms.

export interface ImportRow {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
}

export type ImportAction = "create_and_enrol" | "enrol" | "already_enrolled" | "error";

export interface ImportRowResult {
  row: number; // 1-based, as in the file (not counting the header)
  email: string;
  name: string;
  action: ImportAction;
  reason?: string;
  // Only after a real run, for accounts that were just created. Shown once.
  username?: string;
  generated_password?: string;
}

export interface ImportResult {
  dry_run: boolean;
  rows: ImportRowResult[];
  counts: Record<ImportAction, number>;
}

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const USERNAME = /^[a-zA-Z0-9._-]{3,50}$/;
const MAX_ROWS = 500;

interface ExistingUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
}

async function call<T>(base: string, path: string, method: string, accessToken: string, body?: object): Promise<T> {
  const res = await fetchWithTimeout(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...correlationHeaders() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = (await res.json().catch(() => undefined)) as
    | { success: boolean; message?: string; errors?: unknown; data?: T }
    | undefined;
  if (!res.ok) {
    await throwForFailedResponse(res, `${method} ${path} returned ${res.status}`, parsed);
  }
  return parsed?.data as T;
}

const auth = (path: string, method: string, token: string, body?: object) =>
  call<ExistingUser[]>(`${serverConfig.SERVICE_AUTH_URL}/api/v1/users`, path, method, token, body);

const enrollment = <T>(path: string, method: string, token: string, body?: object) =>
  call<T>(`${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/courses`, path, method, token, body);

function count(rows: ImportRowResult[]): Record<ImportAction, number> {
  const c: Record<ImportAction, number> = { create_and_enrol: 0, enrol: 0, already_enrolled: 0, error: 0 };
  for (const r of rows) c[r.action] += 1;
  return c;
}

export async function importRoster(
  course_id: string,
  input: { rows: ImportRow[]; batch_id: string | null; dry_run: boolean },
  accessToken: string
): Promise<ImportResult> {
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    throw new ValidationError("The file has no students in it");
  }
  if (input.rows.length > MAX_ROWS) {
    throw new ValidationError(`Up to ${MAX_ROWS} students per file`);
  }

  const rows = input.rows.map((r) => ({
    first_name: String(r.first_name ?? "").trim(),
    last_name: String(r.last_name ?? "").trim(),
    username: String(r.username ?? "").trim(),
    email: String(r.email ?? "").trim().toLowerCase(),
  }));

  // Who already has an account, and who is already in this course.
  // The roster call also checks the caller manages this course.
  const [existing, roster] = await Promise.all([
    auth("/lookup", "POST", accessToken, { emails: rows.map((r) => r.email).filter((e) => EMAIL.test(e)) }),
    enrollment<{ student_id: string }[]>(`/${course_id}/roster`, "GET", accessToken),
  ]);
  const userByEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));
  const enrolled = new Set(roster.map((r) => r.student_id));

  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();
  const plan: (ImportRowResult & { user_id?: string; newRow?: ImportRow })[] = rows.map((r, i) => {
    const base = { row: i + 1, email: r.email, name: `${r.first_name} ${r.last_name}`.trim() };
    const fail = (reason: string) => ({ ...base, action: "error" as const, reason });

    if (!EMAIL.test(r.email)) return fail("Email is missing or not valid");
    if (seenEmails.has(r.email)) return fail("Same email appears earlier in the file");
    seenEmails.add(r.email);

    const user = userByEmail.get(r.email);
    if (user) {
      const name = `${user.first_name} ${user.last_name}`;
      return enrolled.has(user.user_id)
        ? { ...base, name, action: "already_enrolled" as const, user_id: user.user_id }
        : { ...base, name, action: "enrol" as const, user_id: user.user_id };
    }

    if (!r.first_name || !r.last_name) return fail("First and last name are needed for a new account");
    const username = r.username || r.email.split("@")[0];
    if (!USERNAME.test(username)) return fail("Username can only use letters, numbers, dots, dashes and underscores (3 to 50)");
    if (seenUsernames.has(username.toLowerCase())) return fail("Same username appears earlier in the file");
    seenUsernames.add(username.toLowerCase());
    return { ...base, action: "create_and_enrol" as const, newRow: { ...r, username } };
  });

  // What goes back to the browser: no internal ids.
  const strip = (p: (typeof plan)[number]): ImportRowResult => ({
    row: p.row,
    email: p.email,
    name: p.name,
    action: p.action,
    ...(p.reason ? { reason: p.reason } : {}),
    ...(p.username ? { username: p.username } : {}),
    ...(p.generated_password ? { generated_password: p.generated_password } : {}),
  });

  if (input.dry_run) {
    const out = plan.map(strip);
    return { dry_run: true, rows: out, counts: count(out) };
  }

  // 1. Create the new accounts. A row can still fail here (e.g. username already taken).
  const toCreate = plan.filter((p) => p.action === "create_and_enrol");
  if (toCreate.length > 0) {
    const created = await adminBatchCreateStudents(
      toCreate.map((p) => p.newRow!),
      accessToken
    );
    const createdByEmail = new Map(created.created.map((c) => [c.user.email.toLowerCase(), c]));
    const failedByEmail = new Map(created.failed.map((f) => [f.row.email.toLowerCase(), f.reason]));
    for (const p of toCreate) {
      const c = createdByEmail.get(p.email);
      if (c) {
        p.user_id = c.user.user_id;
        p.username = c.user.username;
        p.generated_password = c.generated_password;
      } else {
        Object.assign(p, { action: "error", reason: failedByEmail.get(p.email) ?? "Couldn't create the account" });
      }
    }
  }

  // 2. Enrol everyone who has an account now. Students already enrolled are moved into the batch.
  const studentIds = plan
    .filter((p) => p.user_id && (p.action !== "already_enrolled" || input.batch_id))
    .map((p) => p.user_id!);
  if (studentIds.length > 0) {
    try {
      await enrollment(`/${course_id}/roster`, "POST", accessToken, {
        student_ids: studentIds,
        batch_id: input.batch_id,
      });
    } catch (err) {
      // Don't lose the new passwords: report the failure on each row instead of throwing.
      const message = err instanceof Error ? err.message : "Enrolment failed";
      for (const p of plan) {
        if (p.action === "create_and_enrol" && p.user_id) {
          Object.assign(p, { action: "error", reason: `Account created, but not enrolled: ${message}` });
        } else if (p.action === "enrol" || (p.action === "already_enrolled" && input.batch_id)) {
          Object.assign(p, { action: "error", reason: `Not enrolled: ${message}` });
        }
      }
    }
  }

  const out = plan.map(strip);
  return { dry_run: false, rows: out, counts: count(out) };
}
