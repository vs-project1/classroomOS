"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateStudent, type StudentActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

const initialState: StudentActionState = {
  success: false,
};

type EditStudentDialogProps = {
  student: {
    id: string;
    name: string;
    rollNumber: string;
    email: string | null;
    phone: string | null;
  };
};

export function EditStudentDialog({ student }: EditStudentDialogProps) {
  const [state, formAction, isPending] = useActionState(updateStudent, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      // Reset state hack since we're unmounting soon, or keep it.
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update the student's details below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={student.id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${student.id}`}>Full Name</Label>
            <Input id={`edit-name-${student.id}`} name="name" defaultValue={student.name} />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-roll-${student.id}`}>Roll Number</Label>
            <Input id={`edit-roll-${student.id}`} name="rollNumber" defaultValue={student.rollNumber} />
            {state.fieldErrors?.rollNumber && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.rollNumber[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-email-${student.id}`}>Email (Optional)</Label>
            <Input id={`edit-email-${student.id}`} name="email" type="email" defaultValue={student.email || ""} />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${student.id}`}>Phone / Student Number (Optional)</Label>
            <Input id={`edit-phone-${student.id}`} name="phone" type="tel" defaultValue={student.phone || ""} />
            {state.fieldErrors?.phone && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>

          {!state.success && state.message && (
            <p className="text-sm font-medium text-destructive">{state.message}</p>
          )}

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
