import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createModule, getModule, listModules, updateModule, deleteModule } from "../module.controller";
import { moduleService } from "../../services/module.service";

vi.mock("../../services/module.service", () => ({
  moduleService: {
    createModule: vi.fn(),
    getModule: vi.fn(),
    listModules: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
  },
}));

const svc = vi.mocked(moduleService);

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, ...overrides } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createModule", () => {
  it("attaches the course id from the URL to the validated body, and responds 201", async () => {
    svc.createModule.mockResolvedValue({ module_id: "mod-1" } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { title: "Module 1" } });
    const res = fakeRes();

    await createModule(req, res, next);

    expect(svc.createModule).toHaveBeenCalledWith({
      title: "Module 1",
      is_locked: false,
      course_id: "course-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("passes a validation error to next for a missing title", async () => {
    const req = fakeReq({ params: { course_id: "course-1" }, body: {} });
    const res = fakeRes();

    createModule(req, res, next);
    await flush();

    expect(svc.createModule).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("getModule", () => {
  it("fetches the module by id", async () => {
    svc.getModule.mockResolvedValue({ module_id: "mod-1" } as never);
    const req = fakeReq({ params: { module_id: "mod-1" } });
    const res = fakeRes();

    await getModule(req, res, next);

    expect(svc.getModule).toHaveBeenCalledWith("mod-1");
  });
});

describe("listModules", () => {
  it("lists modules for the course", async () => {
    svc.listModules.mockResolvedValue([{ module_id: "mod-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await listModules(req, res, next);

    expect(svc.listModules).toHaveBeenCalledWith("course-1");
  });
});

describe("updateModule", () => {
  it("passes the module id and the validated body through", async () => {
    svc.updateModule.mockResolvedValue({ module_id: "mod-1", title: "Renamed" } as never);
    const req = fakeReq({ params: { module_id: "mod-1" }, body: { title: "Renamed" } });
    const res = fakeRes();

    await updateModule(req, res, next);

    expect(svc.updateModule).toHaveBeenCalledWith("mod-1", { title: "Renamed" });
  });
});

describe("deleteModule", () => {
  it("passes the module id and responds with the right message", async () => {
    svc.deleteModule.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { module_id: "mod-1" } });
    const res = fakeRes();

    await deleteModule(req, res, next);

    expect(svc.deleteModule).toHaveBeenCalledWith("mod-1");
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Module deleted successfully" });
  });
});