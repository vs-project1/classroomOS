"use client";

import { useTransition } from "react";
import { deleteTeacher } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteTeacherButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this teacher? All associated subjects will retain their subject codes but won't have an assigned teacher.")) {
      startTransition(async () => {
        await deleteTeacher(id);
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isPending}
      title="Delete Teacher"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
