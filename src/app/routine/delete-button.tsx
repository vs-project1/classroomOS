"use client";

import { useActionState } from "react";
import { deleteRoutine } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteRoutineButton({ id }: { id: string }) {
  const deleteWithId = deleteRoutine.bind(null, id);
  // @ts-ignore
  const [state, formAction, isPending] = useActionState(deleteWithId, null);

  return (
    <form action={formAction}>
      <Button variant="ghost" size="icon" type="submit" disabled={isPending} title="Delete">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </form>
  );
}
