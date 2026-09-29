import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  createLesson,
  getLesson,
  listLessons,
  updateLesson,
  deleteLesson,
  setVideoUrl,
  removeVideo,
  addResource,
  removeResource,
} from "../lesson.controller";
import { lessonService } from "../../services/lesson.service";

vi.mock("../../services/lesson.service", () => ({
  lessonService: {
    createLesson: vi.fn(),
    getLesson: vi.fn(),
    listLessons: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    setVideoUrl: vi.fn(),
    removeVideo: vi.fn(),
    addResource: vi.fn(),
    removeResource: vi.fn(),
  },
}));

const svc = vi.mocked(lessonService);

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

describe("createLesson", () => {
  it("attaches the module id from the URL to the validated body, and responds 201", async () => {
    svc.createLesson.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { module_id: "mod-1" },
      body: { title: "Lesson 1", content_type: "VIDEO" },
    });
    const res = fakeRes();

    await createLesson(req, res, next);

    expect(svc.createLesson).toHaveBeenCalledWith({
      title: "Lesson 1",
      content_type: "VIDEO",
      is_preview: false,
      module_id: "mod-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("passes a validation error to next for a missing content_type", async () => {
    const req = fakeReq({ params: { module_id: "mod-1" }, body: { title: "Lesson 1" } });
    const res = fakeRes();

    createLesson(req, res, next);
    await flush();

    expect(svc.createLesson).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("getLesson", () => {
  it("fetches the lesson by id", async () => {
    svc.getLesson.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({ params: { lesson_id: "l-1" } });
    const res = fakeRes();

    await getLesson(req, res, next);

    expect(svc.getLesson).toHaveBeenCalledWith("l-1");
  });
});

describe("listLessons", () => {
  it("lists lessons for the module", async () => {
    svc.listLessons.mockResolvedValue([{ lesson_id: "l-1" }] as never);
    const req = fakeReq({ params: { module_id: "mod-1" } });
    const res = fakeRes();

    await listLessons(req, res, next);

    expect(svc.listLessons).toHaveBeenCalledWith("mod-1");
  });
});

describe("updateLesson", () => {
  it("passes the lesson id and validated body through", async () => {
    svc.updateLesson.mockResolvedValue({ lesson_id: "l-1", title: "Renamed" } as never);
    const req = fakeReq({ params: { lesson_id: "l-1" }, body: { title: "Renamed" } });
    const res = fakeRes();

    await updateLesson(req, res, next);

    expect(svc.updateLesson).toHaveBeenCalledWith("l-1", { title: "Renamed" });
  });
});

describe("deleteLesson", () => {
  it("passes the lesson id and responds with the right message", async () => {
    svc.deleteLesson.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { lesson_id: "l-1" } });
    const res = fakeRes();

    await deleteLesson(req, res, next);

    expect(svc.deleteLesson).toHaveBeenCalledWith("l-1");
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Lesson deleted successfully" });
  });
});

describe("setVideoUrl", () => {
  it("passes the lesson id and video_url from the body", async () => {
    svc.setVideoUrl.mockResolvedValue({ lesson_id: "l-1", video_url: "/videos/a.mp4" } as never);
    const req = fakeReq({ params: { lesson_id: "l-1" }, body: { video_url: "/videos/a.mp4" } });
    const res = fakeRes();

    await setVideoUrl(req, res, next);

    expect(svc.setVideoUrl).toHaveBeenCalledWith("l-1", "/videos/a.mp4");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("removeVideo", () => {
  it("passes the lesson id", async () => {
    svc.removeVideo.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({ params: { lesson_id: "l-1" } });
    const res = fakeRes();

    await removeVideo(req, res, next);

    expect(svc.removeVideo).toHaveBeenCalledWith("l-1");
  });
});

describe("addResource", () => {
  it("passes the lesson id, title and pdf_url, and responds 201", async () => {
    svc.addResource.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { lesson_id: "l-1" },
      body: { title: "Slides", pdf_url: "/resources/a.pdf" },
    });
    const res = fakeRes();

    await addResource(req, res, next);

    expect(svc.addResource).toHaveBeenCalledWith("l-1", "Slides", "/resources/a.pdf");
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("removeResource", () => {
  it("passes the lesson and resource ids", async () => {
    svc.removeResource.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({ params: { lesson_id: "l-1", resource_id: "r-1" } });
    const res = fakeRes();

    await removeResource(req, res, next);

    expect(svc.removeResource).toHaveBeenCalledWith("l-1", "r-1");
  });
});