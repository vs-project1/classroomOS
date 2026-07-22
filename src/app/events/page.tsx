import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventActions } from "./event-actions";
import { getPermissions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const permissions = await getPermissions();
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
    <Card key={event.id} className={`flex flex-col rounded-xl overflow-hidden shadow-sm ${isPast ? 'opacity-70 bg-muted/30' : 'border-primary/20 hover:border-primary/50 transition-colors'}`}>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 mb-2">{event.eventType}</span>
            <CardTitle className="text-lg">{event.title}</CardTitle>
          </div>
          {permissions.canCreateEvents && <EventActions id={event.id} />}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4 space-y-4">
        <p className="text-sm whitespace-pre-wrap flex-1 text-foreground/90">{event.description}</p>
        
        <div className="space-y-2.5 text-sm text-muted-foreground bg-muted/30 border border-dashed p-3 rounded-lg">
          <div className="flex items-center gap-2 font-medium text-foreground/80">
            <Calendar className="h-4 w-4 text-primary/70" />
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'full' }).format(event.eventDate)}
          </div>
          {(event.startTime || event.endTime) && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/70" />
              {event.startTime || "?"} - {event.endTime || "?"}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              {event.location}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Events</h2>
          <p className="text-muted-foreground mt-1">School activities and schedules.</p>
        </div>
        {permissions.canCreateEvents && (
          <Link className={buttonVariants({ variant: "default" })} href="/events/new">
            <Plus className="mr-2 h-4 w-4" /> Schedule Event
          </Link>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastEvents.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No upcoming events.</p>
            ) : (
              upcomingEvents.map(e => renderEventCard(e, false))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pastEvents.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No past events.</p>
            ) : (
              pastEvents.map(e => renderEventCard(e, true))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
