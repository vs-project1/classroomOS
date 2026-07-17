"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSubject, type SubjectActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: SubjectActionState = {
  success: false,
};

export function SubjectForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createSubject, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Create Subject</CardTitle>
        <CardDescription>Add a new subject to the classroom system.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} ref={formRef} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name</Label>
            <Input id="name" name="name" placeholder="e.g. Intro to Computer Science" />
            {state.fieldErrors?.name && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Subject Code</Label>
            <Input id="code" name="code" placeholder="e.g. CS101" />
            {state.fieldErrors?.code && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.code[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacherId">Assigned Teacher</Label>
            <select
              id="teacherId"
              name="teacherId"
              defaultValue=""
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
          {state.success && state.message && (
            <p className="text-sm font-medium text-green-600">{state.message}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Subject"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
