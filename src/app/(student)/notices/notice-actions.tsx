"use client";

import { useTransition } from "react";
import { deleteNotice, togglePinNotice } from "./actions";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Trash2 } from "lucide-react";

export function NoticeActions({ id, isPinned }: { id: string, isPinned: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleTogglePin = () => {
    startTransition(() => {
      togglePinNotice(id, !isPinned);
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this notice?")) {
      startTransition(() => {
        deleteNotice(id);
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" onClick={handleTogglePin} disabled={isPending} title={isPinned ? "Unpin" : "Pin"}>
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} title="Delete">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
