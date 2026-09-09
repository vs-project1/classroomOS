"use client";

import { useActionState, useState, useEffect } from "react";
import { addCourseChapter, type ActionState } from "@/features/subjects/actions/syllabus";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const initialState: ActionState = { success: false };

interface AddChapterDialogProps {
  unitId: string;
  subjectId: string;
  unitTitle?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddChapterDialog({
  unitId,
  subjectId,
  unitTitle,
  trigger,
  onSuccess,
}: AddChapterDialogProps) {
  const [state, action, isPending] = useActionState(addCourseChapter, initialState);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Chapter added successfully!");
      setIsOpen(false);
      onSuccess?.();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add New Chapter
            {unitTitle && (
              <span className="block text-xs font-normal text-muted-foreground mt-1 truncate">
                Under {unitTitle}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="unitId" value={unitId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="chapter-title">Chapter Title</Label>
            <Input
              id="chapter-title"
              name="title"
              placeholder="e.g. Chapter 1.1: Client-Server Architecture"
              required
              autoFocus
            />
            {state.fieldErrors?.title && (
              <p className="text-destructive text-sm font-medium">{state.fieldErrors.title[0]}</p>
            )}
          </div>
          {state.message && (
            <p
              className={
                state.success
                  ? "text-emerald-500 text-sm font-medium"
                  : "text-destructive text-sm font-medium"
              }
            >
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Save Chapter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
