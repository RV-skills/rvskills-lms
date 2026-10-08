import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@rv-lms/shared-utils";
import { lessonService } from "../lesson.service";
import { lessonRepository } from "../../repositories/lesson.repository";
import { contentMetadataRepository } from "../../repositories/content-metadata.repository";
import { lessonResourceRepository } from "../../repositories/lesson-resource.repository";

vi.mock("../../repositories/lesson.repository", () => ({
  lessonRepository: {
    getNextOrderIndex: vi.fn(),
    create: vi.fn(),
    findWithContent: vi.fn(),
    findByModule: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    // sic: the repository method really is spelled "softDetele"
    softDetele: vi.fn(),
  },
}));

vi.mock("../../repositories/content-metadata.repository", () => ({
  contentMetadataRepository: { upsertVideoUrl: vi.fn(), remove: vi.fn() },
}));

vi.mock("../../repositories/lesson-resource.repository", () => ({
  lessonResourceRepository: { create: vi.fn(), removeFromLesson: vi.fn() },
}));

const getNextOrderIndex = vi.mocked(lessonRepository.getNextOrderIndex);
const createRow = vi.mocked(lessonRepository.create);
const findWithContent = vi.mocked(lessonRepository.findWithContent);
const findByModule = vi.mocked(lessonRepository.findByModule);
const findById = vi.mocked(lessonRepository.findById);
const updateRow = vi.mocked(lessonRepository.update);
const softDelete = vi.mocked(lessonRepository.softDetele);
const upsertVideo = vi.mocked(contentMetadataRepository.upsertVideoUrl);
const removeVideoRow = vi.mocked(contentMetadataRepository.remove);
const createResourceRow = vi.mocked(lessonResourceRepository.create);
const removeResourceRow = vi.mocked(lessonResourceRepository.removeFromLesson);
const NOW = new Date("2026-01-01T00:00:00.000Z");

function aLesson(overrides: Record<string, unknown> = {}) {
  return {
    lesson_id: "l-1",
    module_id: "mod-1",
    title: "Lesson 1",
    description: null,
    content_type: "VIDEO",
    order_index: 1,
    is_preview: false,
    estimated_duration_mins: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  } as never;
}

describe("lessonService.createLesson", () => {
  it("puts a new lesson after the existing ones when no position is given", async () => {
    getNextOrderIndex.mockResolvedValue(3);
    createRow.mockResolvedValue(aLesson({ order_index: 3 }));

    await lessonService.createLesson({
      module_id: "mod-1",
      title: "Intro",
      content_type: "VIDEO",
    } as never);

    expect(getNextOrderIndex).toHaveBeenCalledWith("mod-1");
    expect(createRow).toHaveBeenCalledWith({
      module_id: "mod-1",
      title: "Intro",
      content_type: "VIDEO",
      order_index: 3,
    });
  });

  it("keeps an explicit position without asking for the next one", async () => {
    createRow.mockResolvedValue(aLesson({ order_index: 2 }));

    await lessonService.createLesson({
      module_id: "mod-1",
      title: "Intro",
      content_type: "VIDEO",
      order_index: 2,
    } as never);

    expect(getNextOrderIndex).not.toHaveBeenCalled();
    expect(createRow).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 2 })
    );
  });

  it("passes the lesson's other fields through unchanged", async () => {
    getNextOrderIndex.mockResolvedValue(1);
    createRow.mockResolvedValue(aLesson());

    await lessonService.createLesson({
      module_id: "mod-1",
      title: "Intro",
      description: "About this lesson",
      content_type: "VIDEO",
      is_preview: true,
      estimated_duration_mins: 10,
    } as never);

    expect(createRow).toHaveBeenCalledWith({
      module_id: "mod-1",
      title: "Intro",
      description: "About this lesson",
      content_type: "VIDEO",
      is_preview: true,
      estimated_duration_mins: 10,
      order_index: 1,
    });
  });

  it("returns the new lesson as a DTO, with no video and no resources by default", async () => {
    getNextOrderIndex.mockResolvedValue(1);
    createRow.mockResolvedValue(aLesson());

    const result = await lessonService.createLesson({
      module_id: "mod-1",
      title: "Lesson 1",
      content_type: "VIDEO",
    } as never);

    expect(result).toEqual({
      lesson_id: "l-1",
      module_id: "mod-1",
      title: "Lesson 1",
      description: null,
      content_type: "VIDEO",
      order_index: 1,
      is_preview: false,
      estimated_duration_mins: null,
      created_at: NOW,
      updated_at: NOW,
      content_metadata: null,
      resources: [],
    });
  });
});

describe("lessonService.getLesson", () => {
  it("throws NotFoundError when the lesson does not exist", async () => {
    findWithContent.mockResolvedValue(null as never);

    await expect(lessonService.getLesson("l-1")).rejects.toThrow(NotFoundError);
  });

  it("reads the lesson together with its content", async () => {
    findWithContent.mockResolvedValue(aLesson());

    await lessonService.getLesson("l-1");

    expect(findWithContent).toHaveBeenCalledWith("l-1");
    expect(findById).not.toHaveBeenCalled();
  });

  it("includes the video metadata and resources when the lesson has them", async () => {
    findWithContent.mockResolvedValue(
      aLesson({
        content_metadata: { video_url: "/videos/a.mp4" },
        resources: [
          { resource_id: "r-1", title: "Slides", resource_type: "PDF", file_url: "https://cdn.example.com/a.pdf" },
        ],
      })
    );

    const result = await lessonService.getLesson("l-1");

    expect(result.content_metadata).toEqual({ video_url: "/videos/a.mp4" });
    expect(result.resources).toEqual([
      { resource_id: "r-1", title: "Slides", resource_type: "PDF", file_url: "https://cdn.example.com/a.pdf" },
    ]);
  });

  it("does not expose internal fields such as deleted_at", async () => {
    findWithContent.mockResolvedValue(aLesson());

    const result = await lessonService.getLesson("l-1");

    expect(result).not.toHaveProperty("deleted_at");
  });
});

describe("lessonService.listLessons", () => {
  it("lists a module's lessons as DTOs", async () => {
    findByModule.mockResolvedValue([
      aLesson(),
      aLesson({ lesson_id: "l-2", order_index: 2 }),
    ] as never);

    const result = await lessonService.listLessons("mod-1");

    expect(findByModule).toHaveBeenCalledWith("mod-1");
    expect(result.map((l) => l.lesson_id)).toEqual(["l-1", "l-2"]);
  });

  it("returns an empty list for a module with no lessons", async () => {
    findByModule.mockResolvedValue([] as never);

    await expect(lessonService.listLessons("mod-1")).resolves.toEqual([]);
  });
});

describe("lessonService.updateLesson", () => {
  it("throws NotFoundError, and updates nothing, when the lesson does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(
      lessonService.updateLesson("l-1", { title: "Renamed" })
    ).rejects.toThrow(NotFoundError);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("updates the lesson, then returns it as it is after the update", async () => {
    findById.mockResolvedValue(aLesson());
    updateRow.mockResolvedValue({} as never);
    findWithContent.mockResolvedValue(aLesson({ title: "Renamed" }));

    const result = await lessonService.updateLesson("l-1", {
      title: "Renamed",
    });

    expect(updateRow).toHaveBeenCalledWith("l-1", { title: "Renamed" });
    expect(result.title).toBe("Renamed");
  });
});

describe("lessonService.deleteLesson", () => {
  it("throws NotFoundError, and deletes nothing, when the lesson does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(lessonService.deleteLesson("l-1")).rejects.toThrow(
      NotFoundError
    );
    expect(softDelete).not.toHaveBeenCalled();
  });

  it("soft-deletes the lesson", async () => {
    findById.mockResolvedValue(aLesson());

    await lessonService.deleteLesson("l-1");

    expect(softDelete).toHaveBeenCalledWith("l-1");
  });
});

describe("lessonService.setVideoUrl", () => {
  it("throws NotFoundError, and saves nothing, when the lesson does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(
      lessonService.setVideoUrl("l-1", "/videos/a.mp4")
    ).rejects.toThrow(NotFoundError);
    expect(upsertVideo).not.toHaveBeenCalled();
  });

  it("saves the URL, then returns the lesson with its video", async () => {
    findById.mockResolvedValue(aLesson());
    upsertVideo.mockResolvedValue({} as never);
    findWithContent.mockResolvedValue(
      aLesson({ content_metadata: { video_url: "/videos/a.mp4" } })
    );

    const result = await lessonService.setVideoUrl("l-1", "/videos/a.mp4");

    expect(upsertVideo).toHaveBeenCalledWith("l-1", "/videos/a.mp4");
    expect(result.content_metadata).toEqual({ video_url: "/videos/a.mp4" });
  });
});

describe("lessonService.removeVideo", () => {
  it("throws NotFoundError, and removes nothing, when the lesson does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(lessonService.removeVideo("l-1")).rejects.toThrow(
      NotFoundError
    );
    expect(removeVideoRow).not.toHaveBeenCalled();
  });

  it("removes the video, then returns the lesson without one", async () => {
    findById.mockResolvedValue(aLesson());
    removeVideoRow.mockResolvedValue({} as never);
    findWithContent.mockResolvedValue(aLesson());

    const result = await lessonService.removeVideo("l-1");

    expect(removeVideoRow).toHaveBeenCalledWith("l-1");
    expect(result.content_metadata).toBeNull();
  });
});

describe("lessonService.addResource", () => {
  const input = {
    title: "Slides",
    resource_type: "SLIDE" as const,
    file_url: "https://cdn.example.com/a.pdf",
  };

  it("throws NotFoundError, and adds nothing, when the lesson does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(lessonService.addResource("l-1", input)).rejects.toThrow(NotFoundError);
    expect(createResourceRow).not.toHaveBeenCalled();
  });

  it("adds the resource with its type, then returns the lesson with it", async () => {
    findById.mockResolvedValue(aLesson());
    createResourceRow.mockResolvedValue({} as never);
    findWithContent.mockResolvedValue(
      aLesson({ resources: [{ resource_id: "r-1", ...input }] })
    );

    const result = await lessonService.addResource("l-1", input);

    expect(createResourceRow).toHaveBeenCalledWith({ lesson_id: "l-1", ...input });
    expect(result.resources).toHaveLength(1);
  });
});


describe("lessonService.removeResource", () => {
  it("removes the resource scoped to this lesson, then returns the lesson as it is afterwards", async () => {
    removeResourceRow.mockResolvedValue(1);
    findWithContent.mockResolvedValue(aLesson());

    const result = await lessonService.removeResource("l-1", "r-1");

    expect(removeResourceRow).toHaveBeenCalledWith("l-1", "r-1");
    expect(result.lesson_id).toBe("l-1");
    expect(result.resources).toEqual([]);
  });

  // Covers both a resource from a different lesson and a lesson that doesn't
  // exist: in either case the scoped delete matches no rows.
  it("throws NotFoundError when no resource matched this lesson", async () => {
    removeResourceRow.mockResolvedValue(0);

    await expect(lessonService.removeResource("l-1", "r-other")).rejects.toThrow(NotFoundError);
    expect(findWithContent).not.toHaveBeenCalled();
  });
});