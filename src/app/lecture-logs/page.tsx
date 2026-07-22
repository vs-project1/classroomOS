import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/time";
import { SectionCard } from "@/components/student/section-card";
import { FileText, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LectureLogsPage() {
  const allSessions = await db.query.classSessions.findMany({
    with: {
      subject: true,
      lectureLog: true,
    },
    orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Lecture Logs</h2>
        <p className="text-muted-foreground mt-1">Review topics covered in past classes.</p>
      </div>

      <SectionCard>
        {allSessions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No lecture logs available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {allSessions.map((session) => (
              <Link 
                href={`/sessions/${session.id}`} 
                key={session.id}
                className="block p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary">{session.subject?.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                        <Calendar className="w-4 h-4" />
                        {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(new Date(session.sessionDate))}
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                        <Clock className="w-4 h-4" />
                        {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 md:border-l md:pl-6 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground block mb-1">Topics Covered:</span>
                    <p className="line-clamp-2">
                      {session.lectureLog?.topicsCovered || "No topics logged."}
                    </p>
                  </div>
                  
                  <div className="shrink-0 pt-2 md:pt-0">
                    <div className={buttonVariants({ variant: "outline", size: "sm", className: "w-full md:w-auto rounded-lg" })}>
                      <FileText className="w-4 h-4 mr-2" /> Read Log
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
