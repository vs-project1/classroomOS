"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStudent, type StudentActionState } from "./actions";
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
