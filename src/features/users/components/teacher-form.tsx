"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveTeacher, type TeacherActionState } from "@/features/users/actions/teacher-actions";
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

type Props = {
  defaultValues?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    faculties?: string[];
    semesters?: string[];
  };
};

const initialState: TeacherActionState = {
  success: false,
};

export function TeacherForm({ defaultValues }: Props) {
  const FACULTIES = ["BCA"];
  const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const [state, formAction, isPending] = useActionState(saveTeacher, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success && !defaultValues?.id) {
      formRef.current?.reset();
      setIsOpen(false);
    }
  }, [state.success, defaultValues?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={<Button className="font-semibold shadow-sm rounded-xl" size="sm" />}>
        <UserPlus className="w-4 h-4 mr-2" />
        {defaultValues?.id ? "Edit Teacher" : "Add Teacher"}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold tracking-tight">{defaultValues?.id ? "Edit Teacher" : "Add Teacher"}</SheetTitle>
          <SheetDescription>
            {defaultValues?.id ? "Update teacher's profile details." : "Register a new teacher in the classroom system."}
          </SheetDescription>
        </SheetHeader>
        
        <form action={formAction} ref={formRef} className="space-y-5 mt-4">
          {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              required
              className="h-10 rounded-lg"
              defaultValue={defaultValues?.name || ""}
              placeholder="e.g. Ramesh Prasad"
            />
            {state.fieldErrors?.name && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              className="h-10 rounded-lg"
              defaultValue={defaultValues?.email || ""}
              placeholder="e.g. ramesh@college.edu.np"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              className="h-10 rounded-lg"
              defaultValue={defaultValues?.phone || ""}
              placeholder="e.g. 9841234567"
            />
            {state.fieldErrors?.phone && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>
          
          <div className="space-y-3">
            <Label className="text-sm font-medium">Faculties</Label>
            <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
              {FACULTIES.map(f => (
                <label key={f} className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                  <input type="checkbox" name="faculties" value={f} defaultChecked={defaultValues?.faculties?.includes(f)} className="rounded border-input text-primary focus:ring-primary h-4 w-4" /> 
                  {f}
                </label>
              ))}
            </div>
            {state.fieldErrors?.faculties && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.faculties[0]}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Semesters</Label>
            <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              {SEMESTERS.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" name="semesters" value={s} defaultChecked={defaultValues?.semesters?.includes(s)} className="rounded border-input text-primary focus:ring-primary h-4 w-4" /> 
                  {s}
                </label>
              ))}
            </div>
            {state.fieldErrors?.semesters && (
              <p className="text-xs font-medium text-destructive">{state.fieldErrors.semesters[0]}</p>
            )}
          </div>
          
          {!state.success && state.message && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{state.message}</p>
          )}
          {state.success && state.message && (
            <p className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">{state.message}</p>
          )}

          <div className="pt-6 pb-4">
            <Button type="submit" disabled={isPending} className="w-full h-11 text-base font-semibold rounded-xl">
              {isPending ? "Saving..." : defaultValues?.id ? "Save Changes" : "Register Teacher"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
