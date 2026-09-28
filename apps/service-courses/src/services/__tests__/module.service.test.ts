import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@rv-lms/shared-utils";
import { moduleService } from "../module.service";
import { moduleRepository } from "../../repositories/module.repository";

vi.mock("../../repositories/module.repository", () => ({
  moduleRepository: {
    getNextOrderIndex: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByCourse: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

const getNextOrderIndex = vi.mocked(moduleRepository.getNextOrderIndex);
const createRow = vi.mocked(moduleRepository.create);
const findById = vi.mocked(moduleRepository.findById);
const findByCourse = vi.mocked(moduleRepository.findByCourse);
const updateRow = vi.mocked(moduleRepository.update);
const softDelete = vi.mocked(moduleRepository.softDelete);

const NOW = new Date("2026-01-01T00:00:00.000Z");

function aModule(overrides: Record<string, unknown> = {}) {
  return {
    module_id: "mod-1",
    course_id: "course-1",
    title: "Module 1",
    description: null,
    order_index: 1,
    is_locked: false,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  } as never;
}

describe("moduleService.createModule", () => {
  const input = { course_id: "course-1", title: "Intro" } as never;

  it("puts a new module after the existing ones when no position is given", async () => {
    getNextOrderIndex.mockResolvedValue(4);
    createRow.mockResolvedValue(aModule({ order_index: 4 }));

    await moduleService.createModule(input);

    expect(getNextOrderIndex).toHaveBeenCalledWith("course-1");
    expect(createRow).toHaveBeenCalledWith({
      course_id: "course-1",
      title: "Intro",
      order_index: 4,
    });
  });

  it("keeps an explicit position without asking for the next one", async () => {
    createRow.mockResolvedValue(aModule({ order_index: 2 }));

    await moduleService.createModule({
      course_id: "course-1",
      title: "Intro",
      order_index: 2,
    } as never);

    expect(getNextOrderIndex).not.toHaveBeenCalled();
    expect(createRow).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 2 })
    );
  });

  it("returns the new module as a DTO", async () => {
    getNextOrderIndex.mockResolvedValue(1);
    createRow.mockResolvedValue(aModule());

    const result = await moduleService.createModule(input);

    expect(result).toEqual({
      module_id: "mod-1",
      course_id: "course-1",
      title: "Module 1",
      description: null,
      order_index: 1,
      is_locked: false,
      created_at: NOW,
      updated_at: NOW,
    });
  });

  it("does not expose internal fields such as deleted_at", async () => {
    getNextOrderIndex.mockResolvedValue(1);
    createRow.mockResolvedValue(aModule());

    const result = await moduleService.createModule(input);

    expect(result).not.toHaveProperty("deleted_at");
  });
});

describe("moduleService.getModule", () => {
  it("throws NotFoundError when the module does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(moduleService.getModule("mod-1")).rejects.toThrow(NotFoundError);
  });

  it("returns lesson summaries when the module comes with its lessons", async () => {
    findById.mockResolvedValue(
      aModule({
        lessons: [
          {
            lesson_id: "l-1",
            module_id: "mod-1",
            title: "Lesson 1",
            content_type: "VIDEO",
            order_index: 1,
            is_preview: true,
            estimated_duration_mins: 12,
            created_at: NOW,
            updated_at: NOW,
            deleted_at: null,
          },
        ],
      })
    );

    const result = await moduleService.getModule("mod-1");

    expect(result.lessons?.[0]).toMatchObject({
      lesson_id: "l-1",
      module_id: "mod-1",
      title: "Lesson 1",
      content_type: "VIDEO",
      order_index: 1,
      is_preview: true,
      estimated_duration_mins: 12,
    });
    expect(result.lessons?.[0]).not.toHaveProperty("deleted_at");
  });

  it("leaves lessons out when the module comes without them", async () => {
    findById.mockResolvedValue(aModule());

    const result = await moduleService.getModule("mod-1");

    expect(result.lessons).toBeUndefined();
  });

  it("keeps an empty lessons list as an empty list", async () => {
    findById.mockResolvedValue(aModule({ lessons: [] }));

    const result = await moduleService.getModule("mod-1");

    expect(result.lessons).toEqual([]);
  });
});

describe("moduleService.listModules", () => {
  it("lists a course's modules as DTOs", async () => {
    findByCourse.mockResolvedValue([
      aModule(),
      aModule({ module_id: "mod-2", order_index: 2 }),
    ] as never);

    const result = await moduleService.listModules("course-1");

    expect(findByCourse).toHaveBeenCalledWith("course-1");
    expect(result.map((m) => m.module_id)).toEqual(["mod-1", "mod-2"]);
  });
});

describe("moduleService.updateModule", () => {
  it("throws NotFoundError, and updates nothing, when the module does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(
      moduleService.updateModule("mod-1", { title: "Renamed" })
    ).rejects.toThrow(NotFoundError);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("updates the module, then returns it as it is after the update", async () => {
    findById
      .mockResolvedValueOnce(aModule())
      .mockResolvedValueOnce(aModule({ title: "Renamed" }));
    updateRow.mockResolvedValue({} as never);

    const result = await moduleService.updateModule("mod-1", {
      title: "Renamed",
    });

    expect(updateRow).toHaveBeenCalledWith("mod-1", { title: "Renamed" });
    expect(result.title).toBe("Renamed");
  });
});

describe("moduleService.deleteModule", () => {
  it("throws NotFoundError, and deletes nothing, when the module does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(moduleService.deleteModule("mod-1")).rejects.toThrow(
      NotFoundError
    );
    expect(softDelete).not.toHaveBeenCalled();
  });

  it("soft-deletes the module", async () => {
    findById.mockResolvedValue(aModule());

    await moduleService.deleteModule("mod-1");

    expect(softDelete).toHaveBeenCalledWith("mod-1");
  });
});