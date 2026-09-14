"use client";

import { useTransition } from "react";
import { deleteTeacher } from "@/features/users/actions/teacher-actions";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";

export function DeleteTeacherButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTeacher(id);
    });
  };

  return (
    <ConfirmDeleteButton
      title="Delete Faculty Member"
      description="Are you sure you want to delete this teacher? All associated subjects will retain their subject codes but won't have an assigned teacher."
      onConfirm={handleDelete}
      isPending={isPending}
      triggerAriaLabel="Delete Teacher"
    />
  );
}
