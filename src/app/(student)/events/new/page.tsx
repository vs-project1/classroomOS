import { EventForm } from "@/features/events/components/event-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/events" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Schedule Event</h2>
          <p className="text-muted-foreground text-sm">Add a new university event, seminar, or workshop.</p>
        </div>
      </div>
      
      <EventForm />
    </div>
  );
}
