import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadGatewayError,
  GatewayTimeoutError,
} from "@rv-lms/shared-utils";
import { appErrorHandler, genericErrorHandler } from "../error.middleware";
const req = {} as never;
const next = vi.fn();

function fakeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as never as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("appErrorHandler: real HTTP status codes for each AppError subclass", () => {
  it.each([
    [new UnauthorizedError("bad token"), 401],
    [new ValidationError("bad input"), 400],
    [new ForbiddenError("not allowed"), 403],
    [new NotFoundError("gone"), 404],
    [new ConflictError("already exists"), 409],
    [new InternalServerError("oops"), 500],
    [new BadGatewayError("downstream failed"), 502],
    [new GatewayTimeoutError("downstream too slow"), 504],
  ])("%s -> status %i", (error, expectedStatus) => {
    const res = fakeRes();

    appErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(expectedStatus);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: error.message,
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("appErrorHandler: a Zod validation error", () => {
  it("returns 400 with one entry per failing field, regardless of which AppError it would otherwise be", () => {
    const schema = z.object({ email: z.string().email(), age: z.number() });
    const result = schema.safeParse({ email: "not-an-email", age: "not-a-number" });
    const res = fakeRes();

    appErrorHandler(result.error!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validation failed");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "age" }),
      ])
    );
  });
});

describe("appErrorHandler: anything else", () => {
  it("passes an ordinary Error along to the next handler, untouched, rather than trying to map it", () => {
    const res = fakeRes();
    const plainError = new Error("something unexpected");

    appErrorHandler(plainError, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(plainError);
  });
});

describe("genericErrorHandler", () => {
  it("always answers 500, regardless of what the error actually is", () => {
    const res = fakeRes();

    genericErrorHandler(new Error("anything"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal Server Error",
    });
  });
});

describe("appErrorHandler: a ValidationError carrying field errors", () => {
  it("passes them on as `errors`, the same shape a Zod error gets", () => {
    const res = fakeRes();

    appErrorHandler(
      new ValidationError("Validation failed", [{ field: "file_url", message: "Must be an https:// URL" }]),
      req,
      res as never,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: [{ field: "file_url", message: "Must be an https:// URL" }],
    });
  });

  it("leaves `errors` out entirely when there are none", () => {
    const res = fakeRes();

    appErrorHandler(new ValidationError("Bad input"), req, res as never, next);

    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Bad input" });
  });
});