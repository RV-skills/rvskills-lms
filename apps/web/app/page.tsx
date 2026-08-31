import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
   <main className="flex flex-col gap-4 p-8">
      <h1 className="text-2xl text-neutral-900">RV Skills LMS</h1>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Enroll now</Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Drop course</Button>
        <Button variant="primary" loading>
          Enroll now
        </Button>
        <Button variant="primary" disabled>
          Enroll now
        </Button>
      </div>
    </main>
  );
}