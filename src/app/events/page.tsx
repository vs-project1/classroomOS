import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventActions } from "./event-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const allEvents = await db.query.events.findMany({
    orderBy: [asc(events.eventDate), asc(events.startTime)],
  });

  // Determine current time in Nepal
  const now = new Date();
  const options = { timeZone: 'Asia/Kathmandu', year: 'numeric', month: 'numeric', day: 'numeric' } as const;
  const nptDateString = new Intl.DateTimeFormat('en-CA', options).format(now);
  const currentNptTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour12: false, hour: '2-digit', minute: '2-digit' });

  const upcomingEvents = allEvents.filter(e => {
    const eDate = new Intl.DateTimeFormat('en-CA', options).format(e.eventDate);
    if (eDate > nptDateString) return true;
    if (eDate === nptDateString) {
      if (e.endTime) return e.endTime > currentNptTime;
      return true; // if no end time, consider it upcoming for the whole day
    }
    return false;
  });

  const pastEvents = allEvents.filter(e => {
    const eDate = new Intl.DateTimeFormat('en-CA', options).format(e.eventDate);
    if (eDate < nptDateString) return true;
    if (eDate === nptDateString) {
      if (e.endTime) return e.endTime <= currentNptTime;
      return false;
    }
    return false;
  });

  // reverse sort past events
  pastEvents.reverse();

  const renderEventCard = (event: typeof allEvents[0], isPast: boolean) => (
    <Card key={event.id} className={`flex flex-col ${isPast ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="outline" className="mb-2">{event.eventType}</Badge>
            <CardTitle className="text-xl">{event.title}</CardTitle>
          </div>
          <EventActions id={event.id} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <p className="text-sm whitespace-pre-wrap flex-1">{event.description}</p>
        
        <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'full' }).format(event.eventDate)}
          </div>
          {(event.startTime || event.endTime) && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {event.startTime || "?"} - {event.endTime || "?"}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Events</h2>
        <Link className={buttonVariants({ variant: "default" })} href="/events/new">
          <Plus className="mr-2 h-4 w-4" /> Schedule Event
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">Upcoming Events</h3>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground col-span-full">No upcoming events.</p>
          ) : (
            upcomingEvents.map(e => renderEventCard(e, false))
          )}
        </div>
      </div>

      {pastEvents.length > 0 && (
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-2xl font-semibold tracking-tight">Past Events</h3>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pastEvents.map(e => renderEventCard(e, true))}
          </div>
        </div>
      )}
    </div>
  );
}
