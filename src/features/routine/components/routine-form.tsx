"use client";

import { useActionState } from "react";
import { saveRoutine } from "@/features/routine/actions/routine-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toSemesterNumber, toSemesterRoman } from "@/lib/semester";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type RoutineFormProps = {
  subjects: { id: string; name: string }[];
  teachers?: { id: string; name: string }[];
  defaultValues?: {
    id?: string;
    subjectId?: string | null;
    teacherId?: string | null;
    semester?: string | number;
    section?: string;
    slotType?: string;
    customTitle?: string | null;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    room?: string;
    notes?: string;
  };
};

export function RoutineForm({ subjects, teachers = [], defaultValues }: RoutineFormProps) {
  const [state, formAction, isPending] = useActionState(saveRoutine, null);

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {state?.message && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="semester">Semester *</Label>
          <select
            id="semester"
            name="semester"
            defaultValue={defaultValues?.semester != null ? (toSemesterRoman(toSemesterNumber(defaultValues.semester) ?? 1)) : "I"}
            required
            className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="section">Section *</Label>
          <select
            id="section"
            name="section"
            defaultValue={defaultValues?.section || "A"}
            required
            className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slotType">Slot Type</Label>
          <select
            id="slotType"
            name="slotType"
            defaultValue={defaultValues?.slotType || "LECTURE"}
            className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="LECTURE">Lecture</option>
            <option value="LAB">Practical / Lab</option>
            <option value="BREAK">Break / Recess</option>
            <option value="ECA">ECA / Sports</option>
            <option value="LIBRARY">Library / Self-Study</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectId">Subject</Label>
        <select
          id="subjectId"
          name="subjectId"
          defaultValue={defaultValues?.subjectId || ""}
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">None / Non-Subject Activity</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {state?.fieldErrors?.subjectId && (
          <p className="text-sm text-red-500">{state.fieldErrors.subjectId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customTitle">Custom Title (Optional for breaks/ECA)</Label>
        <Input
          id="customTitle"
          name="customTitle"
          defaultValue={defaultValues?.customTitle || ""}
          placeholder="e.g. Lunch Break, Project Lab"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacherId">Assigned Teacher</Label>
        <select
          id="teacherId"
          name="teacherId"
          defaultValue={defaultValues?.teacherId || ""}
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Default (From Subject or Unassigned)</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dayOfWeek">Day of Week *</Label>
        <select
          id="dayOfWeek"
          name="dayOfWeek"
          defaultValue={defaultValues?.dayOfWeek ?? ""}
          required
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>Select Day</option>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {state?.fieldErrors?.dayOfWeek && (
          <p className="text-sm text-red-500">{state.fieldErrors.dayOfWeek[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={defaultValues?.startTime}
            required
          />
          {state?.fieldErrors?.startTime && (
            <p className="text-sm text-red-500">{state.fieldErrors.startTime[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={defaultValues?.endTime}
            required
          />
          {state?.fieldErrors?.endTime && (
            <p className="text-sm text-red-500">{state.fieldErrors.endTime[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="room">Room</Label>
        <Input
          id="room"
          name="room"
          defaultValue={defaultValues?.room}
          placeholder="e.g. Room 402"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes}
          placeholder="Any special instructions for this class?"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? "Saving..." : "Save Routine"}
        </Button>
      </div>
    </form>
  );
}
