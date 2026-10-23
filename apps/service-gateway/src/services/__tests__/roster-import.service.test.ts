import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config", () => ({
  serverConfig: { SERVICE_AUTH_URL: "http://auth", SERVICE_ENROLLMENT_URL: "http://enr" },
}));
vi.mock("../users.service", () => ({ adminBatchCreateStudents: vi.fn() }));
vi.mock("../../utils/http-client.util", () => ({
  fetchWithTimeout: vi.fn(),
  correlationHeaders: () => ({}),
  throwForFailedResponse: async (_res: Response, msg: string, body?: { message?: string }) => {
    throw new Error(body?.message ?? msg);
  },
}));

import { importRoster } from "../roster-import.service";
import { adminBatchCreateStudents } from "../users.service";
import { fetchWithTimeout } from "../../utils/http-client.util";

const fetchMock = vi.mocked(fetchWithTimeout);
const createMock = vi.mocked(adminBatchCreateStudents);
let enrolBody: unknown;
let enrolFails = false;

const json = (data: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 409, json: async () => (ok ? { success: true, data } : { success: false, message: data }) }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  enrolBody = undefined;
  enrolFails = false;
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith("/users/lookup")) {
      return json([
        { user_id: "u-old", email: "Old@Example.com", first_name: "Old", last_name: "One", username: "old" },
        { user_id: "u-in", email: "in@example.com", first_name: "In", last_name: "Course", username: "in" },
      ]);
    }
    if (url.endsWith("/roster") && init.method === "GET") return json([{ student_id: "u-in" }]);
    if (url.endsWith("/roster") && init.method === "POST") {
      enrolBody = JSON.parse(init.body as string);
      return enrolFails ? json("Not enough seats", false) : json([]);
    }
    throw new Error(`unexpected ${url}`);
  });
  createMock.mockResolvedValue({
    created: [
      {
        user: { user_id: "u-new", email: "asha@example.com", username: "asha" } as never,
        generated_password: "pw-1",
      },
    ],
    failed: [],
  });
});

const rows = [
  { first_name: "Asha", last_name: "Rao", username: "", email: "Asha@example.com" },
  { first_name: "", last_name: "", username: "", email: "old@example.com" },
  { first_name: "In", last_name: "Course", username: "", email: "in@example.com" },
  { first_name: "Bad", last_name: "Email", username: "", email: "not-an-email" },
  { first_name: "Asha", last_name: "Again", username: "", email: "asha@example.com" },
];

describe("importRoster", () => {
  it("previews without creating or enrolling anyone", async () => {
    const result = await importRoster("c-1", { rows, batch_id: null, dry_run: true }, "t");

    expect(result.rows.map((r) => r.action)).toEqual([
      "create_and_enrol",
      "enrol",
      "already_enrolled",
      "error",
      "error",
    ]);
    expect(result.rows[4].reason).toMatch(/earlier in the file/);
    expect(createMock).not.toHaveBeenCalled();
    expect(enrolBody).toBeUndefined();
  });

  it("creates new accounts, then enrols everyone into the batch", async () => {
    const result = await importRoster("c-1", { rows, batch_id: "b-1", dry_run: false }, "t");

    expect(createMock).toHaveBeenCalledWith(
      [{ first_name: "Asha", last_name: "Rao", username: "asha", email: "asha@example.com" }],
      "t"
    );
    // The student already in the course is moved into the batch too.
    expect(enrolBody).toEqual({ student_ids: ["u-new", "u-old", "u-in"], batch_id: "b-1" });
    expect(result.rows[0]).toMatchObject({ action: "create_and_enrol", generated_password: "pw-1" });
    expect(result.counts).toEqual({ create_and_enrol: 1, enrol: 1, already_enrolled: 1, error: 2 });
  });

  it("keeps new passwords on the rows if enrolment fails", async () => {
    enrolFails = true;
    const result = await importRoster("c-1", { rows, batch_id: null, dry_run: false }, "t");

    expect(result.rows[0]).toMatchObject({ action: "error", generated_password: "pw-1" });
    expect(result.rows[0].reason).toMatch(/Account created, but not enrolled: Not enough seats/);
  });
});
