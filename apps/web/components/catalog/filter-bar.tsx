"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DIFFICULTIES = [
  { label: "All categories", value: "" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const activeDifficulty = searchParams.get("difficulty") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <Input
            placeholder="Search courses..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("search", search);
            }}
          />
        </div>
        <Button onClick={() => updateParam("search", search)}>Search</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            onClick={() => updateParam("difficulty", d.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              activeDifficulty === d.value
                ? "border-primary-500 bg-primary-500 text-white"
                : "border-neutral-500 text-neutral-900 hover:bg-neutral-100"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        {isPending ? "Updating results" : ""}
      </span>
    </div>
  );
}