"use client";

import { useActionState, useState, useEffect } from "react";
import { addCourseUnit, type ActionState } from "@/features/subjects/actions/syllabus";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const initialState: ActionState = { success: false };

interface AddUnitDialogProps {
  subjectId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddUnitDialog({ subjectId, trigger, onSuccess }: AddUnitDialogProps) {
  const [state, action, isPending] = useActionState(addCourseUnit, initialState);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Course unit added successfully!");
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
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" /> Add Unit
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Course Unit</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="subjectId" value={subjectId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit-title">Unit Title</Label>
            <Input
              id="unit-title"
              name="title"
              placeholder="e.g. Unit 1: Introduction to Web Technologies"
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
              {isPending ? "Adding..." : "Save Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
