"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/features/events/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function EventActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this event?")) {
      startTransition(() => {
        deleteEvent(id);
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} title="Delete">
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  );
}
