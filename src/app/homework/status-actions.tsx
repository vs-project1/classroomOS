"use client";

import { useTransition } from "react";
import { updateHomeworkStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Archive, PlayCircle } from "lucide-react";

export function HomeworkStatusActions({ id, currentStatus }: { id: string, currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  const handleStatus = (status: "active" | "completed" | "archived") => {
    startTransition(() => {
      updateHomeworkStatus(id, status);
    });
  };

  return (
    <div className="flex gap-2 mt-4">
      {currentStatus !== "active" && (
        <Button variant="outline" size="sm" onClick={() => handleStatus("active")} disabled={isPending}>
          <PlayCircle className="mr-2 h-4 w-4 text-blue-500" /> Mark Active
        </Button>
      )}
      {currentStatus !== "completed" && (
        <Button variant="outline" size="sm" onClick={() => handleStatus("completed")} disabled={isPending}>
          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Mark Completed
        </Button>
      )}
      {currentStatus !== "archived" && (
        <Button variant="outline" size="sm" onClick={() => handleStatus("archived")} disabled={isPending}>
          <Archive className="mr-2 h-4 w-4 text-gray-500" /> Archive
        </Button>
      )}
    </div>
  );
}
