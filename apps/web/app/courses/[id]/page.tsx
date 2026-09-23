"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCourseDetail, moduleDurationMins, type CourseDetail } from "@/lib/course-details";
import {
  getCourseRatings,
  getAverageRating,
  submitRating,
  type CourseRating,
  type AverageRating,
} from "@/lib/rating";
import Link from "next/link";

type Tab = "syllabus" | "reviews";

function difficultyToTone(difficulty: string): BadgeTone {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "success";
    case "intermediate":
      return "warning";
    case "advanced":
      return "danger";
    default:
      return "neutral";
  }
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? "fill-primary-500 text-primary-500" : "text-neutral-100"}
        />
      ))}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<CourseDetail | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>("syllabus");
  const [ratings, setRatings] = useState<CourseRating[]>([]);
  const [average, setAverage] = useState<AverageRating | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const loadRatings = useCallback(() => {
    getCourseRatings(courseId).then(setRatings);
    getAverageRating(courseId).then(setAverage);
  }, [courseId]);

  useEffect(() => {
    getCourseDetail(courseId).then(setCourse);
    loadRatings();
  }, [courseId, loadRatings]);

  async function handleSubmitReview() {
    if (reviewStars === 0) {
      setReviewError("Select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    setReviewError(null);
    try {
      const result = await submitRating(courseId, {
        stars: reviewStars,
        comment: reviewComment.trim() || undefined,
      });
      if (result.status === "not_available") {
        setReviewError(result.message);
        return;
      }
      setReviewSuccess(true);
      setReviewComment("");
      setReviewStars(0);
      loadRatings();
    } finally {
      setSubmitting(false);
    }
  }

  if (course === undefined) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  if (course === null) {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">Course not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This course may have been removed or is no longer available.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 pb-28">
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="h-64 flex-1 rounded-lg bg-neutral-100" />
        <div className="flex flex-1 flex-col gap-3">
          <Badge tone={difficultyToTone(course.difficulty)} className="self-start">
            {course.difficulty}
          </Badge>
          <h1 className="text-2xl text-neutral-900">{course.title}</h1>
          {course.description && (
            <p className="text-sm text-neutral-500">{course.description}</p>
          )}
          <div className="flex items-center gap-2">
            <Avatar name={course.instructorName} size="sm" />
            <span className="text-sm text-neutral-900">{course.instructorName}</span>
          </div>
          {average && average.count > 0 && (
            <div className="flex items-center gap-2">
              <Stars value={average.average ?? 0} />
              <span className="text-sm text-neutral-900">{average.average?.toFixed(1)}</span>
              <span className="text-sm text-neutral-500">
                ({average.count} review{average.count !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex gap-6 border-b border-neutral-100">
        <button
          onClick={() => setActiveTab("syllabus")}
          className={`-mb-px border-b-2 pb-3 text-sm ${
            activeTab === "syllabus"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Syllabus
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`-mb-px border-b-2 pb-3 text-sm ${
            activeTab === "reviews"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Reviews
        </button>
      </div>

      {activeTab === "syllabus" && (
        <div className="mt-6 flex flex-col gap-2">
          {course.modules.map((module) => {
            const duration = moduleDurationMins(module);
            return (
              <div
                key={module.module_id}
                className="flex items-center justify-between rounded-md bg-neutral-50 px-4 py-3"
              >
                <span className="text-sm text-neutral-900">
                  {module.title}
                  {module.is_locked && (
                    <span className="ml-2 text-xs text-neutral-500">(locked)</span>
                  )}
                </span>
                <span className="text-xs text-neutral-500">
                  {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                  {duration !== null && ` \u00b7 ${duration} min`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-sm text-neutral-900">Leave a review</p>
            <p className="mt-1 text-xs text-neutral-500">
              Available once you&apos;ve completed this course.
            </p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewStars(n)}>
                  <Star
                    size={22}
                    className={n <= reviewStars ? "fill-primary-500 text-primary-500" : "text-neutral-100"}
                  />
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 w-full rounded-md border border-neutral-100 p-3 text-sm"
              rows={3}
              placeholder="Optional comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            {reviewError && <p className="mt-2 text-sm text-danger">{reviewError}</p>}
            {reviewSuccess && <p className="mt-2 text-sm text-success">Review submitted.</p>}
            <Button size="sm" className="mt-3" onClick={handleSubmitReview} loading={submitting}>
              Submit review
            </Button>
          </div>

          {ratings.length === 0 ? (
            <p className="text-sm text-neutral-500">No reviews yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {ratings.map((r) => (
                <div key={r.rating_id} className="border-b border-neutral-100 pb-4">
                  <Stars value={r.stars} size={14} />
                  {r.comment && <p className="mt-2 text-sm text-neutral-900">{r.comment}</p>}
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-60 right-0 flex items-center justify-between border-t border-neutral-100 bg-white px-6 py-4">
        <div>
          <p className="text-xs text-neutral-500">Price</p>
          <p className="text-lg text-neutral-900">Free</p>
        </div>
        <Link href={`/courses/${courseId}/checkout`}>
          <Button>Enroll now</Button>
        </Link>
      </div>
    </main>
  );
}