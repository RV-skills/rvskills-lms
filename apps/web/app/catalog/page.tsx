import { getCourses, type CourseFilters } from "@/lib/courses";
import { CourseCard } from "@/components/ui/course-card";
import { FilterBar } from "@/components/catalog/filter-bar";

interface CatalogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toSingleValue(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;

  const filters: CourseFilters = {
    search: toSingleValue(params.search),
    difficulty: toSingleValue(params.difficulty),
  };

  const courses = await getCourses(filters);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl text-neutral-900">Course catalog</h1>

      <div className="mt-6">
        <FilterBar />
      </div>

      {courses.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-lg text-neutral-900">No courses match your filters</p>
          <p className="mt-1 text-sm text-neutral-500">
            Try adjusting your search or clearing a filter.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.course_id}
              href={`/courses/${course.course_id}`}
              title={course.title}
              thumbnailUrl={course.thumbnail_url}
              difficulty={course.difficulty}
              instructorName={course.instructorName}
              footer={{ kind: "enroll" }}
            />
          ))}
        </div>
      )}
    </main>
  );
}