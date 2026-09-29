import { describe, expect, it } from "vitest";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadGatewayError,
} from "@rv-lms/shared-utils";
import { throwForFailedResponse } from "../http-client.util";

function fakeResponse(status: number, body?: unknown) {
  return {
    status,
    json: async () => body ?? {},
  } as unknown as Response;
}

describe("throwForFailedResponse: maps a real status code to the matching error", () => {
  it.each([
    [400, ValidationError],
    [401, UnauthorizedError],
    [403, ForbiddenError],
    [404, NotFoundError],
    [409, ConflictError],
    [418, BadGatewayError],
    [500, BadGatewayError],
    [503, BadGatewayError],
  ])("status %i -> %s", async (status, ErrorClass) => {
    await expect(
      throwForFailedResponse(fakeResponse(status), "fallback message")
    ).rejects.toBeInstanceOf(ErrorClass);
  });
});

describe("throwForFailedResponse: the error message", () => {
  it("uses the downstream service's own message when the body has one", async () => {
    const res = fakeResponse(403, { message: "You are not assigned to this course" });

    await expect(throwForFailedResponse(res, "fallback")).rejects.toThrow(
      "You are not assigned to this course"
    );
  });

  it("falls back to the given message when the body has none", async () => {
    const res = fakeResponse(403, {});

    await expect(throwForFailedResponse(res, "fallback message")).rejects.toThrow(
      "fallback message"
    );
  });

  it("falls back to the given message when the body cannot be parsed as JSON", async () => {
    const res = { status: 502, json: async () => { throw new Error("not JSON"); } } as unknown as Response;

    await expect(throwForFailedResponse(res, "fallback message")).rejects.toThrow(
      "fallback message"
    );
  });

  it("uses an already-parsed body instead of reading the response again", async () => {
    // Reading res.json() twice on a real fetch Response throws. Passing the
    // already-parsed body must skip that second read entirely.
    const res = {
      status: 409,
      json: async () => {
        throw new Error("Body has already been read");
      },
    } as unknown as Response;

    await expect(
      throwForFailedResponse(res, "fallback", { message: "Already assigned" })
    ).rejects.toThrow("Already assigned");
  });
});