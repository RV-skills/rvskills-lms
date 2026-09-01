import { notFound } from "next/navigation";
import { getCoursePlayerData } from "@/lib/course-player";
import { cn } from "@/lib/utils";

interface CoursePlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePlayerPage({ params }: CoursePlayerPageProps) {
  const { id } = await params;
  const data = await getCoursePlayerData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <div className="aspect-video w-full rounded-lg bg-neutral-900" />
        <div>
          <h1 className="text-lg text-neutral-900">{data.currentLesson.title}</h1>
          {data.currentLesson.estimated_duration_mins !== null && (
            <p className="mt-1 text-xs text-neutral-500">
              {data.currentLesson.estimated_duration_mins} min
            </p>
          )}
        </div>
      </div>

      <aside className="w-full flex-shrink-0 lg:w-72">
        <h2 className="text-sm font-medium text-neutral-900">Course content</h2>
        <div className="mt-4 flex flex-col gap-4">
          {data.modules.map((module) => (
            <div key={module.module_id}>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {module.title}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.lesson_id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                      lesson.status === "current" && "bg-neutral-50 font-medium text-neutral-900",
                      lesson.status !== "current" && "text-neutral-500"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 flex-shrink-0 rounded-full",
                        lesson.status === "completed" && "bg-success",
                        lesson.status === "current" && "bg-primary-500",
                        lesson.status === "upcoming" && "border border-neutral-100"
                      )}
                    />
                    {lesson.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}