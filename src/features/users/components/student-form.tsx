"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStudent, type StudentActionState } from "@/features/users/actions/student-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: StudentActionState = {
  success: false,
};

export function StudentForm() {
  const [state, formAction, isPending] = useActionState(createStudent, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Register Student</CardTitle>
        <CardDescription>Add a new student to the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} ref={formRef} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" placeholder="e.g. John Doe" />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rollNumber">Roll Number</Label>
            <Input id="rollNumber" name="rollNumber" placeholder="e.g. CS-2023-001" />
            {state.fieldErrors?.rollNumber && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.rollNumber[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input id="email" name="email" type="email" placeholder="e.g. student@example.com" />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone / Student Number (Optional)</Label>
            <Input id="phone" name="phone" type="tel" placeholder="e.g. +977-9800000000" />
            {state.fieldErrors?.phone && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty">Faculty</Label>
            <select
              id="faculty"
              name="faculty"
              className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              defaultValue=""
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
            <Label htmlFor="semester">Semester</Label>
            <select
              id="semester"
              name="semester"
              className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              defaultValue=""
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
          {state.success && state.message && (
            <p className="text-sm font-medium text-green-600">{state.message}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Registering..." : "Register Student"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
