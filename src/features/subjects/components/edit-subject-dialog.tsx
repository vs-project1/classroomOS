"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSubject } from "@/features/subjects/actions/update";
import type { SubjectActionState } from "@/features/subjects/actions/create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: SubjectActionState = {
  success: false,
};

type EditSubjectDialogProps = {
  subject: {
    id: string;
    name: string;
    code: string;
    semester: string;
    teacherId: string | null;
  };
  teachers: { id: string; name: string }[];
};

export function EditSubjectDialog({ subject, teachers }: EditSubjectDialogProps) {
  const [state, formAction, isPending] = useActionState(updateSubject, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit / Assign Teacher</span>
          </Button>
        }
      />
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Subject & Assign Teacher</DialogTitle>
          <DialogDescription>
            Update subject details and assign or reassign its primary faculty member.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" key={JSON.stringify(subject)}>
          <input type="hidden" name="id" value={subject.id} />

          <div className="space-y-2">
            <Label htmlFor={`edit-name-${subject.id}`}>Subject Name</Label>
            <Input id={`edit-name-${subject.id}`} name="name" defaultValue={subject.name} />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-code-${subject.id}`}>Subject Code</Label>
            <Input id={`edit-code-${subject.id}`} name="code" defaultValue={subject.code} />
            {state.fieldErrors?.code && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.code[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-semester-${subject.id}`}>Semester</Label>
            <select
              id={`edit-semester-${subject.id}`}
              name="semester"
              defaultValue={subject.semester}
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="I">Semester I</option>
              <option value="II">Semester II</option>
              <option value="III">Semester III</option>
              <option value="IV">Semester IV</option>
              <option value="V">Semester V</option>
              <option value="VI">Semester VI</option>
              <option value="VII">Semester VII</option>
              <option value="VIII">Semester VIII</option>
            </select>
            {state.fieldErrors?.semester && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.semester[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-teacherId-${subject.id}`}>Assigned Teacher</Label>
            <select
              id={`edit-teacherId-${subject.id}`}
              name="teacherId"
              defaultValue={subject.teacherId || ""}
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a teacher (Optional)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {!state.success && state.message && (
            <p className="text-sm font-medium text-destructive">{state.message}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
