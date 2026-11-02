// "14 lessons · about 3 hours" for course cards.
export function formatCourseLength(lessons: number, mins: number | null): string {
  const parts = [`${lessons} lesson${lessons !== 1 ? "s" : ""}`];
  if (mins && mins > 0) {
    if (mins < 60) {
      parts.push(`${mins} min`);
    } else {
      const hours = Math.round((mins / 60) * 2) / 2;
      parts.push(`about ${hours} ${hours === 1 ? "hour" : "hours"}`);
    }
  }
  return parts.join(" · ");
}
