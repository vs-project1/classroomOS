"use client";

import { useActionState } from "react";
import { createResourceAction } from "../actions/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function ResourceForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createResourceAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && (
        <div className="p-3 bg-green-50 text-green-800 rounded-md border border-green-200 text-sm">
          {state.message}
        </div>
      )}
      
      {!state?.success && state?.message && (
        <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-200 text-sm">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Resource Title</Label>
        <Input id="title" name="title" required placeholder="e.g. Chapter 1 Slides" />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectId">Subject</Label>
        <select 
          id="subjectId"
          name="subjectId" 
          required 
          defaultValue={subjects[0]?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>Select a subject</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.subjectId && (
          <p className="text-sm text-destructive">{state.fieldErrors.subjectId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileUrl">Resource URL / External Link</Label>
        <Input id="fileUrl" name="fileUrl" type="url" required placeholder="https://..." />
        {state?.fieldErrors?.fileUrl && (
          <p className="text-sm text-destructive">{state.fieldErrors.fileUrl}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileType">Resource Type</Label>
        <select 
          id="fileType"
          name="fileType" 
          required 
          defaultValue="pdf"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>Select type</option>
          <option value="pdf">PDF Document</option>
          <option value="slides">Presentation Slides</option>
          <option value="link">External Link</option>
          <option value="zip">ZIP Archive</option>
          <option value="code">Source Code</option>
          <option value="doc">Word Document</option>
        </select>
        {state?.fieldErrors?.fileType && (
          <p className="text-sm text-destructive">{state.fieldErrors.fileType}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" name="description" placeholder="Brief description of the resource..." />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
          </>
        ) : (
          "Upload Resource"
        )}
      </Button>
    </form>
  );
}
