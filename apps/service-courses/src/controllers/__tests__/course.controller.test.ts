import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  publishCourse,
  unpublishCourse,
  deleteCourse,
  listFaculty,
  assignFaculty,
  removeFaculty,
  listMyCourses,
} from "../course.controller";
import { courseService } from "../../services/course.service";
import { NotFoundError } from "@rv-lms/shared-utils";

vi.mock("../../services/course.service", () => ({
  courseService: {
    createCourse: vi.fn(),
    getCourseWithDetails: vi.fn(),
    listCourses: vi.fn(),
    updateCourse: vi.fn(),
    publishCourse: vi.fn(),
    unpublishCourse: vi.fn(),
    deleteCourse: vi.fn(),
    listFaculty: vi.fn(),
    assignFaculty: vi.fn(),
    removeFaculty: vi.fn(),
    listMyCourses: vi.fn(),
  },
}));

const svc = vi.mocked(courseService);
const DEFAULT_TENANT = "rv-skills-tenant";
const FACULTY = { user_id: "f-1", tenant_id: DEFAULT_TENANT, roles: ["Faculty"], permissions: ["course:write"] };

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    user: FACULTY,
    ...overrides,
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCourse", () => {
  it("attaches the default tenant and the creator's id, and responds 201", async () => {
    svc.createCourse.mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({ body: { title: "New Course" } });
    const res = fakeRes();

    await createCourse(req, res, next);

    // CreateCourseSchema fills in language and difficulty defaults via Zod,
    // even though this request only supplied a title.
    expect(svc.createCourse).toHaveBeenCalledWith(
      { title: "New Course", language: "en", difficulty: "beginner", tenant_id: DEFAULT_TENANT },
      "f-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("passes a validation error to next for a title that is too short", async () => {
    const req = fakeReq({ body: { title: "" } });
    const res = fakeRes();

    createCourse(req, res, next);
    await flush();

    expect(svc.createCourse).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("getCourse", () => {
  it("returns a published course to anyone", async () => {
    svc.getCourseWithDetails.mockResolvedValue({ course_id: "course-1", is_published: true } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, user: undefined });
    const res = fakeRes();

    await getCourse(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { course_id: "course-1", is_published: true },
    });
  });

  it("hides a draft as NotFoundError from a caller without course:write", async () => {
    svc.getCourseWithDetails.mockResolvedValue({ course_id: "course-1", is_published: false } as never);
    const req = fakeReq({
      params: { course_id: "course-1" },
      user: { user_id: "s-1", tenant_id: DEFAULT_TENANT, roles: ["Student"], permissions: [] },
    });
    const res = fakeRes();

    getCourse(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
  });

  it("shows a draft to a caller with course:write", async () => {
    svc.getCourseWithDetails.mockResolvedValue({ course_id: "course-1", is_published: false } as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getCourse(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("listCourses", () => {
  it("forces is_published true for a caller who is not an Admin", async () => {
    svc.listCourses.mockResolvedValue([] as never);
    const req = fakeReq({
      user: { user_id: "f-1", tenant_id: DEFAULT_TENANT, roles: ["Faculty"], permissions: [] },
    });
    const res = fakeRes();

    await listCourses(req, res, next);

    expect(svc.listCourses).toHaveBeenCalledWith(
      DEFAULT_TENANT,
      expect.objectContaining({ is_published: true })
    );
  });

  it("lets an Admin see drafts, honoring an explicit is_published filter", async () => {
    svc.listCourses.mockResolvedValue([] as never);
    const req = fakeReq({
      query: { is_published: "false" },
      user: { user_id: "a-1", tenant_id: DEFAULT_TENANT, roles: ["Admin"], permissions: [] },
    });
    const res = fakeRes();

    await listCourses(req, res, next);

    expect(svc.listCourses).toHaveBeenCalledWith(
      DEFAULT_TENANT,
      expect.objectContaining({ is_published: false })
    );
  });

  it("lets an Admin see everything when no is_published filter is given", async () => {
    svc.listCourses.mockResolvedValue([] as never);
    const req = fakeReq({
      user: { user_id: "a-1", tenant_id: DEFAULT_TENANT, roles: ["Admin"], permissions: [] },
    });
    const res = fakeRes();

    await listCourses(req, res, next);

    expect(svc.listCourses).toHaveBeenCalledWith(
      DEFAULT_TENANT,
      expect.objectContaining({ is_published: undefined })
    );
  });
});

describe("updateCourse", () => {
  it("passes the course id, default tenant, and validated body through", async () => {
    svc.updateCourse.mockResolvedValue({ course_id: "course-1", title: "Renamed" } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { title: "Renamed" } });
    const res = fakeRes();

    await updateCourse(req, res, next);

    expect(svc.updateCourse).toHaveBeenCalledWith("course-1", DEFAULT_TENANT, { title: "Renamed" });
  });
});

describe.each([
  ["publishCourse", publishCourse, "publishCourse", "Course published successfully"],
  ["unpublishCourse", unpublishCourse, "unpublishCourse", "Course unpublished successfully"],
  ["deleteCourse", deleteCourse, "deleteCourse", "Course deleted successfully"],
] as const)("%s", (_name, controller, serviceMethod, message) => {
  it(`calls ${serviceMethod} with the course id and default tenant, and responds with the right message`, async () => {
    vi.mocked(svc[serviceMethod]).mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await controller(req, res, next);

    expect(svc[serviceMethod]).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
    expect(res.json).toHaveBeenCalledWith({ success: true, message });
  });
});

describe("faculty management", () => {
  it("listFaculty lists a course's faculty", async () => {
    svc.listFaculty.mockResolvedValue([{ faculty_id: "f-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await listFaculty(req, res, next);

    expect(svc.listFaculty).toHaveBeenCalledWith("course-1");
  });

  it("assignFaculty passes the faculty id, role and default tenant, and responds 201", async () => {
    svc.assignFaculty.mockResolvedValue({ course_id: "course-1", faculty_id: "f-2" } as never);
    const req = fakeReq({
      params: { course_id: "course-1" },
      body: { faculty_id: "f-2", role: "co_faculty" },
    });
    const res = fakeRes();

    await assignFaculty(req, res, next);

    expect(svc.assignFaculty).toHaveBeenCalledWith("course-1", "f-2", DEFAULT_TENANT, "co_faculty");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("removeFaculty passes the course and faculty ids", async () => {
    svc.removeFaculty.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1", faculty_id: "f-2" } });
    const res = fakeRes();

    await removeFaculty(req, res, next);

    expect(svc.removeFaculty).toHaveBeenCalledWith("course-1", "f-2");
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe("listMyCourses", () => {
  it("uses the authenticated user's id and the default tenant", async () => {
    svc.listMyCourses.mockResolvedValue([{ course_id: "course-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listMyCourses(req, res, next);

    expect(svc.listMyCourses).toHaveBeenCalledWith("f-1", DEFAULT_TENANT);
  });
});