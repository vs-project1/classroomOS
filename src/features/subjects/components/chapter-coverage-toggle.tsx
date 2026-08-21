"use client";

import { useFormStatus } from "react-dom";
import { toggleChapterCoveredAction } from "@/features/subjects/actions/subject-actions";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

function SubmitButton({ covered }: { covered: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="xs" disabled={pending} aria-label={covered ? "Mark chapter uncovered" : "Mark chapter covered"}>
      {covered ? (
        <>
          <CheckCircle2 className="text-emerald-500" />
          Mark uncovered
        </>
      ) : (
        <>
          <Circle className="text-muted-foreground" />
          Mark covered
        </>
      )}
    </Button>
  );
}

export function ChapterCoverageToggle({
  chapterId,
  covered,
}: {
  chapterId: string;
  covered: boolean;
}) {
  return (
    <form action={async (formData) => { await toggleChapterCoveredAction(formData); }} className="shrink-0">
      <input type="hidden" name="chapterId" value={chapterId} />
      <SubmitButton covered={covered} />
    </form>
  );
}
