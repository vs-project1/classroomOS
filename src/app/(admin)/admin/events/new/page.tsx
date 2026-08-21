import { EventForm } from "./event-form";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Schedule Event</h2>
      </div>
      
      <EventForm />
    </div>
  );
}
