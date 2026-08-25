"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStudent, type StudentActionState } from "@/features/users/actions/student-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const initialState: StudentActionState = {
  success: false,
};

export function StudentForm() {
  const [state, formAction, isPending] = useActionState(createStudent, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setIsOpen(false);
    }
  }, [state.success]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={<Button className="font-semibold shadow-sm rounded-xl" size="sm" />}>
        <UserPlus className="w-4 h-4 mr-2" />
        Register Student
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold tracking-tight">Register Student</SheetTitle>
          <SheetDescription>
            Add a new scholar to the system. They will be able to log in with their email.
          </SheetDescription>
        </SheetHeader>
        
        <form action={formAction} ref={formRef} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <Input id="name" name="name" placeholder="e.g. John Doe" className="h-10 rounded-lg" required />
            {state.fieldErrors?.name && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rollNumber" className="text-sm font-medium">Roll Number</Label>
            <Input id="rollNumber" name="rollNumber" placeholder="e.g. CS-2023-001" className="h-10 rounded-lg" required />
            {state.fieldErrors?.rollNumber && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.rollNumber[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input id="email" name="email" type="email" placeholder="e.g. student@example.com" className="h-10 rounded-lg" />
            {state.fieldErrors?.email && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input id="phone" name="phone" type="tel" placeholder="e.g. +977-9800000000" className="h-10 rounded-lg" />
            {state.fieldErrors?.phone && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faculty" className="text-sm font-medium">Faculty</Label>
              <select
                id="faculty"
                name="faculty"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue=""
                required
              >
                <option value="" disabled>Select</option>
                <option value="BCA">BCA</option>
              </select>
              {state.fieldErrors?.faculty && (
                <p className="text-xs font-medium text-destructive">{state.fieldErrors.faculty[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester" className="text-sm font-medium">Semester</Label>
              <select
                id="semester"
                name="semester"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue=""
                required
              >
                <option value="" disabled>Select</option>
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
                <p className="text-xs font-medium text-destructive">{state.fieldErrors.semester[0]}</p>
              )}
            </div>
          </div>
          
          {!state.success && state.message && (
            <p className="text-sm font-medium text-destructive">{state.message}</p>
          )}
          {state.success && state.message && (
            <p className="text-sm font-medium text-green-600">{state.message}</p>
          )}

          <div className="pt-6">
            <Button type="submit" disabled={isPending} className="w-full h-11 text-base font-semibold rounded-xl">
              {isPending ? "Registering..." : "Complete Registration"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
