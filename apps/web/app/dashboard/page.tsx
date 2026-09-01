import { getMyLearning } from "@/lib/my-learning";
import { CourseCard } from "@/components/ui/course-card";

export default async function DashboardPage() {
    const { inProgress, completed } = await getMyLearning();

    return (
        <main className="mx-auto max-w-6xl px-6 py-10">
            <h1 className="text-2xl text-neutral-900">My learning</h1>
            <section className="mt-8">
                <h2 className="text-xl text-neutral-900">In progress</h2>
                {inProgress.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">
                    You haven&apos;t started any courses yet.
                </p>
                ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {inProgress.map((course) => (
                    <CourseCard
                        key={course.course_id}
                        href={`/courses/${course.course_id}`}
                        title={course.title}
                        thumbnailUrl={course.thumbnail_url}
                        difficulty={course.difficulty}
                        instructorName={course.instructorName}
                        footer={{ kind: "progress", value: course.progress }}
                    />
                    ))}
                </div>
                )}
            </section>
            {completed.length > 0 && (
                <section className="mt-10">
                    <h2 className="text-xl text-neutral-900">Completed</h2>
                        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {completed.map((course) => (
                            <CourseCard
                                key={course.course_id}
                                href={`/courses/${course.course_id}`}
                                title={course.title}
                                thumbnailUrl={course.thumbnail_url}
                                difficulty={course.difficulty}
                                instructorName={course.instructorName}
                                footer={{ kind: "completed" }}
                            />
                            ))}
                        </div>
                </section>
            )}
        </main>
    );
}