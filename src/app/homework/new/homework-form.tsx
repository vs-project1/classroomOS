"use client";

import { useActionState } from "react";
import { createHomework } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function HomeworkForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createHomework, null);

  const getNepalDateString = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kathmandu',
    }).format(new Date());
  };

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state?.message && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subjectId">Subject *</Label>
        <select
          id="subjectId"
          name="subjectId"
          required
          defaultValue=""
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="" disabled>Select Subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {state?.fieldErrors?.subjectId && (
          <p className="text-sm text-red-500">{state.fieldErrors.subjectId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required placeholder="e.g. Chapter 4 Exercises" />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-red-500">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea id="description" name="description" required placeholder="Detailed instructions..." className="min-h-[100px]" />
        {state?.fieldErrors?.description && (
          <p className="text-sm text-red-500">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignedDate">Assigned Date *</Label>
          <Input id="assignedDate" name="assignedDate" type="date" required defaultValue={getNepalDateString()} />
          {state?.fieldErrors?.assignedDate && (
            <p className="text-sm text-red-500">{state.fieldErrors.assignedDate[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input id="dueDate" name="dueDate" type="date" required />
          {state?.fieldErrors?.dueDate && (
            <p className="text-sm text-red-500">{state.fieldErrors.dueDate[0]}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Assigning..." : "Assign"}
      </Button>
    </form>
  );
}
