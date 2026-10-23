// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportStudents } from "../import-students";
import * as rosterImport from "@/lib/roster-import";

vi.mock("@/lib/roster-import", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/roster-import")>();
  return { ...real, importRoster: vi.fn() };
});

const importMock = vi.mocked(rosterImport.importRoster);
const batch = { batch_id: "b1", course_id: "c1", name: "Nov 2026", start_date: "2026-11-01", end_date: null, student_count: 0, modules: [] };
const CSV = "first_name,last_name,username,email\nAsha,Rao,,asha@example.com\n";
// Some jsdom versions have no File.text(), so give the test file one.
const file = () => Object.assign(new File([CSV], "students.csv", { type: "text/csv" }), { text: async () => CSV });

beforeEach(() => {
  vi.clearAllMocks();
  importMock.mockImplementation(async (_c, data) => ({
    dry_run: data.dry_run,
    counts: { create_and_enrol: 1, enrol: 0, already_enrolled: 0, error: 0 },
    rows: [
      {
        row: 1,
        email: "asha@example.com",
        name: "Asha Rao",
        action: "create_and_enrol",
        ...(data.dry_run ? {} : { username: "asha", generated_password: "pw" }),
      },
    ],
  }));
});

describe("ImportStudents", () => {
  it("previews first, then adds the students to the chosen batch on confirm", async () => {
    const onDone = vi.fn();
    render(<ImportStudents courseId="c1" batches={[batch]} onDone={onDone} />);

    await userEvent.selectOptions(screen.getByLabelText("Batch for imported students"), "b1");
    await userEvent.upload(screen.getByLabelText("Student CSV file"), file());

    expect(await screen.findByText("New account + enrol")).toBeTruthy();
    expect(importMock).toHaveBeenLastCalledWith("c1", {
      rows: [{ first_name: "Asha", last_name: "Rao", username: "", email: "asha@example.com" }],
      batch_id: "b1",
      dry_run: true,
    });

    await userEvent.click(screen.getByText("Confirm & add 1 student"));
    expect(importMock).toHaveBeenLastCalledWith("c1", expect.objectContaining({ dry_run: false, batch_id: "b1" }));
    expect(await screen.findByText("Download logins (CSV)")).toBeTruthy();
    expect(onDone).toHaveBeenCalled();
  });
});
