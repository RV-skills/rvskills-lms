import { describe, expect, it } from "vitest";
import { credentialsCsv, parseStudentCsv } from "../roster-import";

describe("parseStudentCsv", () => {
  it("reads the template, including Excel's BOM and Windows line endings", () => {
    const text = "\uFEFFfirst_name,last_name,username,email\r\nAsha,Rao,asha.rao,asha.rao@example.com\r\n\r\n";
    expect(parseStudentCsv(text)).toEqual({
      rows: [{ first_name: "Asha", last_name: "Rao", username: "asha.rao", email: "asha.rao@example.com" }],
      error: null,
    });
  });

  it("matches columns by name, in any order, with quoted values", () => {
    const text = 'Email,First Name,Last Name,Phone\nr@x.com,"Rahul, Jr",Kumar,999';
    expect(parseStudentCsv(text).rows).toEqual([
      { first_name: "Rahul, Jr", last_name: "Kumar", username: "", email: "r@x.com" },
    ]);
  });

  it("explains a file without an email column", () => {
    expect(parseStudentCsv("name\nAsha").error).toMatch(/No email column/);
    expect(parseStudentCsv("email").error).toMatch(/at least one student/);
  });
});

describe("credentialsCsv", () => {
  it("lists only the new accounts", () => {
    const csv = credentialsCsv({
      dry_run: false,
      counts: { create_and_enrol: 1, enrol: 1, already_enrolled: 0, error: 0 },
      rows: [
        { row: 1, email: "a@x.com", name: "Asha Rao", action: "create_and_enrol", username: "a", generated_password: "p1" },
        { row: 2, email: "b@x.com", name: "Old One", action: "enrol" },
      ],
    });
    expect(csv).toBe("name,email,username,password\nAsha Rao,a@x.com,a,p1");
  });
});
