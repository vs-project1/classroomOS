import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Calendar, Clock, MapPin, Ticket, CalendarPlus, Download } from "lucide-react";
import { EventActions } from "./event-actions";
import { getPermissions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatTime12h } from "@/lib/timezone";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const permissions = await getPermissions();
  const allEvents = await db.query.events.findMany({
    orderBy: [asc(events.eventDate), asc(events.startTime)],
  });

  // Determine current time in Nepal
  const now = new Date();
  const options = { timeZone: 'Asia/Kathmandu', year: 'numeric', month: 'numeric', day: 'numeric' } as const;
  const nptDateString = formatNepaliDate(now);
  const currentNptTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour12: false, hour: '2-digit', minute: '2-digit' });

  const upcomingEvents = allEvents.filter(e => {
    const eDate = formatNepaliDate(e.eventDate);
    if (eDate > nptDateString) return true;
    if (eDate === nptDateString) {
      if (e.endTime) return e.endTime > currentNptTime;
      return true; // if no end time, consider it upcoming for the whole day
    }
    return false;
  });

  const pastEvents = allEvents.filter(e => {
    const eDate = formatNepaliDate(e.eventDate);
    if (eDate < nptDateString) return true;
    if (eDate === nptDateString) {
      if (e.endTime) return e.endTime <= currentNptTime;
      return false;
    }
    return false;
  });

  // reverse sort past events
  pastEvents.reverse();

  const renderEventList = (eventsList: typeof allEvents, isPast: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {eventsList.length === 0 ? (
        <div className="md:col-span-2 flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <Ticket className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">No scheduled events in this view.</p>
        </div>
      ) : (
        eventsList.map(event => (
          <div key={event.id} className={`group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative ${isPast ? 'opacity-60 grayscale-[0.2]' : ''}`}>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                  {event.eventType}
                </div>
                {permissions.canCreateEvents && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
                    <EventActions id={event.id} />
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold font-fira-sans text-foreground leading-tight mb-2">{event.title}</h3>
              
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 font-medium" title={event.description || ""}>
                {event.description}
              </p>
              
              <div className="space-y-2 mt-auto text-xs text-muted-foreground font-fira-code">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-60 shrink-0" />
                  <span>{formatNepaliDate(event.eventDate)}</span>
                </div>
                {(event.startTime || event.endTime) && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-60 shrink-0" />
                    <span>
                      {event.startTime ? formatTime12h(event.startTime) : ""}
                      {event.endTime ? ` - ${formatTime12h(event.endTime)}` : ""}
                    </span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-60 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-border/50 bg-muted/5 flex justify-end">
               <button className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer" disabled={isPast}>
                 {isPast ? "Event Concluded" : "Register Attendance"} <Ticket className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Events</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Register for upcoming hackathons, track guest lectures, and sync department-wide academic symposiums.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateEvents && (
            <Link className={`text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer`} href="/admin/events/new">
              <Plus className="h-3.5 w-3.5" /> Schedule Event
            </Link>
          )}
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <CalendarPlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Events Scheduled</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No upcoming institutional events or departmental activities are scheduled. Extracurricular programs, IT workshops, and semester orientations will populate here.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4" /> Sync University Calendar
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors cursor-pointer">
              Propose Student Event
            </button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6 w-full md:w-auto h-11 bg-muted/50 p-1 border rounded-xl">
            <TabsTrigger value="upcoming" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Upcoming ({upcomingEvents.length})</TabsTrigger>
            <TabsTrigger value="past" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Past ({pastEvents.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderEventList(upcomingEvents, false)}
          </TabsContent>
          
          <TabsContent value="past" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderEventList(pastEvents, true)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
