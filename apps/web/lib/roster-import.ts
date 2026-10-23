import { gatewayFetch } from "./gateway-client";

export interface ImportRow {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
}

export type ImportAction = "create_and_enrol" | "enrol" | "already_enrolled" | "error";

export interface ImportRowResult {
  row: number;
  email: string;
  name: string;
  action: ImportAction;
  reason?: string;
  username?: string;
  generated_password?: string;
}

export interface ImportResult {
  dry_run: boolean;
  rows: ImportRowResult[];
  counts: Record<ImportAction, number>;
}

export function importRoster(
  courseId: string,
  data: { rows: ImportRow[]; batch_id: string | null; dry_run: boolean }
): Promise<ImportResult> {
  return gatewayFetch<ImportResult>(`/api/v1/courses/${courseId}/roster/import`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Splits one CSV line, allowing "quoted, values" and "" for a quote inside quotes.
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

const COLUMNS: Record<keyof ImportRow, string[]> = {
  first_name: ["first_name", "firstname", "first"],
  last_name: ["last_name", "lastname", "last", "surname"],
  username: ["username", "user_name"],
  email: ["email", "email_address", "e-mail"],
};

// Reads the student CSV (header row first). Columns are matched by name, so their order
// doesn't matter and Excel's extra columns are ignored. Username is optional.
export function parseStudentCsv(text: string): { rows: ImportRow[]; error: string | null } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: "The file needs a header row and at least one student." };
  }

  const header = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const index = Object.fromEntries(
    (Object.keys(COLUMNS) as (keyof ImportRow)[]).map((key) => [key, header.findIndex((h) => COLUMNS[key].includes(h))])
  ) as Record<keyof ImportRow, number>;

  if (index.email < 0) {
    return { rows: [], error: "No email column found. The first row should be: first_name,last_name,username,email" };
  }

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const get = (key: keyof ImportRow) => (index[key] >= 0 ? cells[index[key]] ?? "" : "");
    return { first_name: get("first_name"), last_name: get("last_name"), username: get("username"), email: get("email") };
  });
  return { rows, error: null };
}

// The new accounts and their one-time passwords, to save and share with the students.
export function credentialsCsv(result: ImportResult): string {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = result.rows
    .filter((r) => r.generated_password)
    .map((r) => [r.name, r.email, r.username ?? "", r.generated_password ?? ""].map(quote).join(","));
  return ["name,email,username,password", ...lines].join("\n");
}
