"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSubject, type SubjectActionState } from "@/features/subjects/actions/create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: SubjectActionState = {
  success: false,
};

export function SubjectForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createSubject, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Subject
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subject</DialogTitle>
          <DialogDescription>Add a new subject to the classroom system.</DialogDescription>
        </DialogHeader>
        
        <form action={formAction} ref={formRef} className="space-y-4">
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
            <Label htmlFor="semester">Semester</Label>
            <select
              id="semester"
              name="semester"
              defaultValue="I"
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="I">Semester I</option>
              <option value="II">Semester II</option>
              <option value="III">Semester III</option>
              <option value="IV">Semester IV</option>
              <option value="V">Semester V</option>
              <option value="VI">Semester VI</option>
              <option value="VII">Semester VII</option>
              <option value="VIII">Semester VIII</option>
            </select>
            {state.fieldErrors?.semester && (
              <p className="text-sm font-medium text-destructive">{state.fieldErrors.semester[0]}</p>
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

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Subject"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
