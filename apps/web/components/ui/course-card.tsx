// components/ui/course-card.tsx
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "./avatar";
import { Badge, type BadgeTone } from "./badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

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

export interface CourseCardProps {
  href: string;
  title: string;
  thumbnailUrl?: string | null;
  difficulty: string;
  instructorName: string;
  instructorAvatarUrl?: string | null;
  footer:
    | { kind: "enroll" }
    | { kind: "progress"; value: number }
    | { kind: "completed" };
  className?: string;
}

export function CourseCard({
  href,
  title,
  thumbnailUrl,
  difficulty,
  instructorName,
  instructorAvatarUrl,
  footer,
  className,
}: CourseCardProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-card transition-shadow hover:shadow-md",
        className
      )}
    >
      <Link href={href} className="relative block h-40 w-full bg-neutral-100">
        {thumbnailUrl && (
          <Image src={thumbnailUrl} alt="" fill className="object-cover" />
        )}
        <Badge tone={difficultyToTone(difficulty)} className="absolute left-2.5 top-2.5 bg-white/90">
          {difficulty}
        </Badge>
      </Link>

      <div className="flex flex-col gap-3 p-4">
        <Link href={href}>
          <h3 className="text-lg text-neutral-900 line-clamp-2">{title}</h3>
        </Link>

        <div className="flex items-center gap-2">
          <Avatar name={instructorName} src={instructorAvatarUrl} size="sm" />
          <span className="text-sm text-neutral-500">{instructorName}</span>
        </div>

        {footer.kind === "enroll" && <Button size="sm">Enroll now</Button>}

        {footer.kind === "progress" && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, footer.value))}%` }}
              />
            </div>
            <span className="text-xs text-neutral-500">{footer.value}% complete</span>
          </div>
        )}

        {footer.kind === "completed" && (
          <Button variant="secondary" size="sm">
            View certificate
          </Button>
        )}
      </div>
    </div>
  );
}