import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCourseDetail, getCourseDetailForViewer } from "../courses.service";
import { fetchWithTimeout } from "../../utils/http-client.util";
import { getUsersByIds } from "../users.service";

vi.mock("../../utils/http-client.util", async () => {
  const actual = await vi.importActual<typeof import("../../utils/http-client.util")>(
    "../../utils/http-client.util"
  );
  return { ...actual, fetchWithTimeout: vi.fn() };
});

vi.mock("../users.service", () => ({ getUsersByIds: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTimeout);
const mockUsers = vi.mocked(getUsersByIds);

function fakeResponse(status: number, body: unknown = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

// One course taught by "u-fac", with a free preview lesson and a normal (paid) lesson.
function aCourse() {
  return {
    course_id: "course-1",
    title: "System Design",
    faculty: [{ faculty_id: "u-fac" }],
    modules: [
      {
        module_id: "m-1",
        title: "Basics",
        is_locked: false,
        lessons: [
          {
            lesson_id: "l-preview",
            title: "Free intro",
            content_type: "VIDEO",
            is_preview: true,
            content_metadata: { video_url: "https://cdn.example.com/intro.mp4" },
            resources: [
              { resource_id: "r-1", title: "Intro notes", resource_type: "PDF", file_url: "https://cdn.example.com/intro.pdf" },
            ],
          },
          {
            lesson_id: "l-paid",
            title: "Deep dive",
            content_type: "VIDEO",
            is_preview: false,
            content_metadata: { video_url: "https://cdn.example.com/deep.mp4" },
            resources: [
              { resource_id: "r-2", title: "Deep notes", resource_type: "PDF", file_url: "https://cdn.example.com/deep.pdf" },
            ],
          },
        ],
      },
    ],
  };
}

function lessonsOf(detail: Awaited<ReturnType<typeof getCourseDetail>>) {
  const [preview, paid] = detail!.modules[0].lessons;
  return { preview, paid };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockUsers.mockReset();
  mockFetch.mockResolvedValue(fakeResponse(200, { success: true, data: aCourse() }));
  mockUsers.mockResolvedValue([{ user_id: "u-fac", first_name: "Faculty", last_name: "One" }] as never);
});

describe("getCourseDetailForViewer", () => {
  it("strips paid content links for an anonymous visitor", async () => {
    const { paid } = lessonsOf(await getCourseDetailForViewer("course-1", undefined, undefined));

    expect(paid.video_url).toBeNull();
    expect(paid.resources).toEqual([]);
  });

  it("keeps the content of free preview lessons for an anonymous visitor", async () => {
    const { preview } = lessonsOf(await getCourseDetailForViewer("course-1", undefined, undefined));

    expect(preview.video_url).toBe("https://cdn.example.com/intro.mp4");
    expect(preview.resources).toHaveLength(1);
  });

  it("keeps the outline (titles, types) even when content is stripped", async () => {
    const { paid } = lessonsOf(await getCourseDetailForViewer("course-1", undefined, undefined));

    expect(paid.title).toBe("Deep dive");
    expect(paid.content_type).toBe("VIDEO");
  });

  it("strips paid content links for a logged-in student", async () => {
    const { paid } = lessonsOf(
      await getCourseDetailForViewer("course-1", "token", { user_id: "u-student", isAdmin: false })
    );

    expect(paid.video_url).toBeNull();
    expect(paid.resources).toEqual([]);
  });

  it("strips paid content links for faculty who teach a different course", async () => {
    const { paid } = lessonsOf(
      await getCourseDetailForViewer("course-1", "token", { user_id: "u-other-fac", isAdmin: false })
    );

    expect(paid.video_url).toBeNull();
  });

  it("gives the full content to faculty assigned to this course", async () => {
    const { paid } = lessonsOf(
      await getCourseDetailForViewer("course-1", "token", { user_id: "u-fac", isAdmin: false })
    );

    expect(paid.video_url).toBe("https://cdn.example.com/deep.mp4");
    expect(paid.resources[0].file_url).toBe("https://cdn.example.com/deep.pdf");
  });

  it("gives the full content to an admin", async () => {
    const { paid } = lessonsOf(
      await getCourseDetailForViewer("course-1", "token", { user_id: "u-admin", isAdmin: true })
    );

    expect(paid.video_url).toBe("https://cdn.example.com/deep.mp4");
  });

  it("returns null when the course does not exist", async () => {
    mockFetch.mockResolvedValue(fakeResponse(404));

    expect(await getCourseDetailForViewer("missing", undefined, undefined)).toBeNull();
  });
});

describe("getCourseDetail", () => {
  // The player relies on this returning everything; it does its own enrollment checks.
  it("still returns full content links, with no viewer filtering", async () => {
    const { paid } = lessonsOf(await getCourseDetail("course-1", "token"));

    expect(paid.video_url).toBe("https://cdn.example.com/deep.mp4");
    expect(paid.resources[0].file_url).toBe("https://cdn.example.com/deep.pdf");
  });
});