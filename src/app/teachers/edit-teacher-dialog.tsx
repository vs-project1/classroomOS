"use client";

import { useActionState, useEffect, useState } from "react";
import { saveTeacher, type TeacherActionState } from "./actions";
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

const initialState: TeacherActionState = {
  success: false,
};

type EditTeacherDialogProps = {
  teacher: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
};

export function EditTeacherDialog({ teacher }: EditTeacherDialogProps) {
  const [state, formAction, isPending] = useActionState(saveTeacher, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update the teacher's details below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4" key={JSON.stringify(teacher)}>
          <input type="hidden" name="id" value={teacher.id} />
          
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${teacher.id}`}>Full Name</Label>
            <Input id={`edit-name-${teacher.id}`} name="name" defaultValue={teacher.name} />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-email-${teacher.id}`}>Email (Optional)</Label>
            <Input id={`edit-email-${teacher.id}`} name="email" type="email" defaultValue={teacher.email || ""} />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${teacher.id}`}>Phone Number (Optional)</Label>
            <Input id={`edit-phone-${teacher.id}`} name="phone" type="tel" defaultValue={teacher.phone || ""} />
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
