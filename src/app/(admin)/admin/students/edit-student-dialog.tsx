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
    faculty: string | null;
    semester: string | null;
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
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update the student's details below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4" key={JSON.stringify(student)}>
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
          <div className="space-y-2">
            <Label htmlFor={`edit-faculty-${student.id}`}>Faculty</Label>
            <select
              id={`edit-faculty-${student.id}`}
              name="faculty"
              className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              defaultValue={student.faculty || ""}
            >
              <option value="" disabled>Select Faculty</option>
              <option value="BCA">BCA</option>
              <option value="BIM">BIM</option>
              <option value="BBM">BBM</option>
              <option value="BBA">BBA</option>
              <option value="BBS">BBS</option>
              <option value="BSc.CSIT">BSc.CSIT</option>
            </select>
            {state.fieldErrors?.faculty && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.faculty[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-semester-${student.id}`}>Semester</Label>
            <select
              id={`edit-semester-${student.id}`}
              name="semester"
              className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              defaultValue={student.semester || ""}
            >
              <option value="" disabled>Select Semester</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
              <option value="VI">VI</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
            </select>
            {state.fieldErrors?.semester && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.semester[0]}</p>
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
