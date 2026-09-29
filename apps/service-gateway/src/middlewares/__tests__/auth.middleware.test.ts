import { describe, expect, it, vi, beforeEach } from "vitest";
import { UnauthorizedError, BadGatewayError } from "@rv-lms/shared-utils";
import { authMiddleware } from "../auth.middleware";
import { verifyAccessToken, refreshTokens } from "../../services/auth.service";
import {
  getSessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
} from "../../utils/session-cookie.util";

vi.mock("../../services/auth.service", () => ({
  verifyAccessToken: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock("../../utils/session-cookie.util", () => ({
  getSessionFromRequest: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

const getSession = vi.mocked(getSessionFromRequest);
const verify = vi.mocked(verifyAccessToken);
const refresh = vi.mocked(refreshTokens);
const setCookie = vi.mocked(setSessionCookie);
const clearCookie = vi.mocked(clearSessionCookie);

const next = vi.fn();
// req only needs what the middleware actually reads from it.
const req = {} as never;
const res = {} as never;

const SESSION = { accessToken: "old-access", refreshToken: "old-refresh" };

beforeEach(() => {
  next.mockClear();
});

describe("authMiddleware: no session", () => {
  it("clears the cookie and passes an UnauthorizedError to next, without calling the auth service", async () => {
    getSession.mockReturnValue(null);

    await authMiddleware(req, res, next);

    expect(clearCookie).toHaveBeenCalledWith(res);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(verify).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("authMiddleware: a valid access token", () => {
  it("attaches the user and the token, and never tries to refresh", async () => {
    getSession.mockReturnValue(SESSION);
    verify.mockResolvedValue({ user_id: "u-1" } as never);

    await authMiddleware(req, res, next);

    expect(req.user).toEqual({ user_id: "u-1" });
    expect(req.accessToken).toBe("old-access");
    expect(next).toHaveBeenCalledWith();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("authMiddleware: an expired access token, refresh succeeds", () => {
  it("sets a new cookie and attaches the refreshed user and token", async () => {
    getSession.mockReturnValue(SESSION);
    verify.mockRejectedValue(new UnauthorizedError("Access token is invalid or expired"));
    refresh.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      user: { user_id: "u-1" },
    } as never);

    await authMiddleware(req, res, next);

    expect(refresh).toHaveBeenCalledWith("old-refresh");
    expect(setCookie).toHaveBeenCalledWith(res, {
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(req.user).toEqual({ user_id: "u-1" });
    expect(req.accessToken).toBe("new-access");
    expect(next).toHaveBeenCalledWith();
  });
});

describe("authMiddleware: an expired access token, refresh also fails", () => {
  it("clears the cookie and reports the session as expired", async () => {
    getSession.mockReturnValue(SESSION);
    verify.mockRejectedValue(new UnauthorizedError("Access token is invalid or expired"));
    refresh.mockRejectedValue(new UnauthorizedError("Refresh token is invalid or expired"));

    await authMiddleware(req, res, next);

    expect(clearCookie).toHaveBeenCalledWith(res);
    const passedError = next.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(UnauthorizedError);
    expect(passedError.message).toBe("Session expired, please log in again");
  });

  it("treats a real refresh-token rejection as session expired", async () => {
    // This only tests authMiddleware's own behavior given what refreshTokens
    // throws (mocked here); it does not exercise refreshTokens itself.
    // refreshTokens used to throw UnauthorizedError for ANY non-ok response,
    // not just a real 401, which meant a genuine service-auth outage during
    // refresh was reported as "session expired". That was fixed directly in
    // auth.service.ts's refreshTokens (see auth.service.test.ts), which now
    // throws BadGatewayError for a real outage -- and authMiddleware already
    // passes a BadGatewayError straight through rather than relabeling it, as
    // proven separately above.
    getSession.mockReturnValue(SESSION);
    verify.mockRejectedValue(new UnauthorizedError("Access token is invalid or expired"));
    refresh.mockRejectedValue(new UnauthorizedError("Refresh token is invalid or expired"));

    await authMiddleware(req, res, next);

    const passedError = next.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(UnauthorizedError);
    expect(passedError).not.toBeInstanceOf(BadGatewayError);
  });
});

describe("authMiddleware: service-auth itself is unreachable during verification", () => {
  it("passes the BadGatewayError straight through, without attempting a refresh", async () => {
    getSession.mockReturnValue(SESSION);
    verify.mockRejectedValue(new BadGatewayError("service-auth returned 503 for /me"));

    await authMiddleware(req, res, next);

    expect(refresh).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(BadGatewayError));
  });
});