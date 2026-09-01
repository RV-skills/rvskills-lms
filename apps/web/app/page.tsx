import { CourseCard } from "@/components/ui/course-card";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl text-neutral-900">RV Skills LMS</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CourseCard
          href="/courses/1"
          title="Intro to System Design"
          difficulty="intermediate"
          instructorName="Arpit Bhayani"
          footer={{ kind: "enroll" }}
        />
        <CourseCard
          href="/courses/2"
          title="Database Internals"
          difficulty="advanced"
          instructorName="Alex Petrov"
          footer={{ kind: "progress", value: 62 }}
        />
        <CourseCard
          href="/courses/3"
          title="Foundations of Distributed Systems"
          difficulty="beginner"
          instructorName="Martin Kleppmann"
          footer={{ kind: "completed" }}
        />
      </div>
    </main>
  );
}