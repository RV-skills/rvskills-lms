"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/user-session";
import { getCourses, type CourseListItem } from "@/lib/courses";
import { formatCourseLength } from "@/lib/course-length";

// Contact details shown in the footer. A line is left out while it is empty, and the
// Contact link in the header only shows once at least one of them is filled in.
const CONTACT = {
  address: "",
  phone: "",
  email: "",
};

const hasContact = Object.values(CONTACT).some((v) => v.trim() !== "");

function SiteHeader({ loggedIn, loading }: { loggedIn: boolean; loading: boolean }) {
  return (
    <header className="border-b border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-neutral-900">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-500 text-sm font-bold text-white"
          >
            RV
          </span>
          <span className="text-lg font-semibold">RV Skills</span>
        </Link>

        <nav aria-label="Main" className="flex flex-wrap items-center gap-6 text-sm">
          <a href="#courses" className="text-neutral-900 hover:text-primary-700">
            Courses
          </a>
          {hasContact && (
            <a href="#contact" className="text-neutral-900 hover:text-primary-700">
              Contact
            </a>
          )}
          {!loading &&
            (loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary-500 px-4 font-semibold text-white hover:bg-primary-600"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="font-semibold text-primary-700 hover:text-primary-600">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center rounded-md bg-primary-500 px-4 font-semibold text-white hover:bg-primary-600"
                >
                  Get started
                </Link>
              </>
            ))}
        </nav>
      </div>
    </header>
  );
}

function LandingCourseCard({ course }: { course: CourseListItem }) {
  const href = `/courses/${course.course_id}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-card">
      <div className="relative h-40 w-full bg-primary-50">
        {course.thumbnail_url && (
          // A plain img: thumbnails can be on any https host, which next/image would need configured.
          <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-grow flex-col gap-2.5 p-5">
        <span className="self-start rounded-sm bg-neutral-100 px-2.5 py-1 text-xs capitalize text-neutral-900">
          {course.difficulty}
        </span>
        <h3 className="text-lg text-neutral-900">{course.title}</h3>
        {course.description && (
          <p className="line-clamp-3 text-sm text-neutral-500">{course.description}</p>
        )}
        <span className="mt-auto pt-2 text-xs text-neutral-500">
          {formatCourseLength(course.total_lessons, course.total_duration_mins)}
        </span>
        <Link
          href={href}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600"
        >
          View course
        </Link>
      </div>
    </article>
  );
}

function SiteFooter({ loggedIn }: { loggedIn: boolean }) {
  return (
    <footer id="contact" className="border-t border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-8 pt-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold text-neutral-900">RV Skills</span>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-neutral-900">Learn</span>
            <a href="#courses" className="text-primary-700 hover:text-primary-600">
              Courses
            </a>
            {loggedIn ? (
              <Link href="/dashboard" className="text-primary-700 hover:text-primary-600">
                My dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-primary-700 hover:text-primary-600">
                  Log in
                </Link>
                <Link href="/register" className="text-primary-700 hover:text-primary-600">
                  Create an account
                </Link>
              </>
            )}
          </div>
          {hasContact && (
            <div className="flex flex-col gap-2 text-sm text-neutral-500">
              <span className="font-semibold text-neutral-900">Contact</span>
              {CONTACT.address && <span>{CONTACT.address}</span>}
              {CONTACT.phone && (
                <a href={`tel:${CONTACT.phone.replace(/\s+/g, "")}`} className="text-primary-700 hover:text-primary-600">
                  {CONTACT.phone}
                </a>
              )}
              {CONTACT.email && (
                <a href={`mailto:${CONTACT.email}`} className="text-primary-700 hover:text-primary-600">
                  {CONTACT.email}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-neutral-100 pt-5 text-xs text-neutral-500">
          © {new Date().getFullYear()} RV Skills. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const { user, loading } = useSession({ redirectOnUnauthorized: false });
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <SiteHeader loggedIn={!!user} loading={loading} />

      <main id="courses" className="mx-auto w-full max-w-6xl flex-grow px-6 pb-20 pt-16">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl text-neutral-900">Our courses</h1>
          <p className="text-base text-neutral-500">
            Start with the essentials or go straight to advanced topics.
          </p>
        </div>

        {failed ? (
          <p className="text-sm text-neutral-500">Couldn&apos;t load courses right now. Please refresh the page.</p>
        ) : courses === null ? (
          <p className="text-sm text-neutral-500">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-neutral-500">New courses are coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <LandingCourseCard key={course.course_id} course={course} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter loggedIn={!!user} />
    </div>
  );
}
