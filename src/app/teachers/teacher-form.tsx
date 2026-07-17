"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveTeacher, type TeacherActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  defaultValues?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
};

const initialState: TeacherActionState = {
  success: false,
};

export function TeacherForm({ defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(saveTeacher, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && !defaultValues?.id) {
      formRef.current?.reset();
    }
  }, [state.success, defaultValues?.id]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{defaultValues?.id ? "Edit Teacher" : "Add Teacher"}</CardTitle>
        <CardDescription>
          {defaultValues?.id ? "Update teacher's profile details." : "Register a new teacher in the classroom system."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} ref={formRef} className="space-y-4 max-w-md">
          {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name || ""}
              placeholder="e.g. Ramesh Prasad"
            />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email || ""}
              placeholder="e.g. ramesh@college.edu.np"
            />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaultValues?.phone || ""}
              placeholder="e.g. 9841234567"
            />
            {state.fieldErrors?.phone && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>
          
          {state.message && (
            <p className={`text-sm font-medium ${state.success ? "text-green-600" : "text-destructive"}`}>
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : defaultValues?.id ? "Update Teacher" : "Register Teacher"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
