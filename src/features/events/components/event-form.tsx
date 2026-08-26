"use client";

import { useActionState } from "react";
import { createEvent } from "@/features/events/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export function EventForm() {
  const [state, formAction, isPending] = useActionState(createEvent, null);

  const getNepalDateString = () => {
    return formatNepaliDate(new Date());
  };

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state?.message && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required placeholder="e.g. BCA First Year Orientation" />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-red-500">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventType">Event Type *</Label>
        <select
          id="eventType"
          name="eventType"
          required
          defaultValue="Academic"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="Academic">Academic</option>
          <option value="Extracurricular">Extracurricular</option>
          <option value="Holiday">Holiday</option>
          <option value="Exam">Exam</option>
          <option value="Other">Other</option>
        </select>
        {state?.fieldErrors?.eventType && (
          <p className="text-sm text-red-500">{state.fieldErrors.eventType[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea id="description" name="description" required placeholder="Event details..." className="min-h-[100px]" />
        {state?.fieldErrors?.description && (
          <p className="text-sm text-red-500">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Event Date *</Label>
        <Input id="eventDate" name="eventDate" type="date" required defaultValue={getNepalDateString()} />
        {state?.fieldErrors?.eventDate && (
          <p className="text-sm text-red-500">{state.fieldErrors.eventDate[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time (Optional)</Label>
          <Input id="startTime" name="startTime" type="time" />
          {state?.fieldErrors?.startTime && (
            <p className="text-sm text-red-500">{state.fieldErrors.startTime[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time (Optional)</Label>
          <Input id="endTime" name="endTime" type="time" />
          {state?.fieldErrors?.endTime && (
            <p className="text-sm text-red-500">{state.fieldErrors.endTime[0]}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">If providing times, both Start and End time must be filled.</p>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="e.g. Auditorium" />
      </div>

      <div className="pt-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? "Scheduling..." : "Schedule Event"}
        </Button>
      </div>
    </form>
  );
}
