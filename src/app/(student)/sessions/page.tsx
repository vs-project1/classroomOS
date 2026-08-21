import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { FileText, Plus, BookOpen, ArrowRight } from "lucide-react";
import { formatTime12h } from "@/lib/time";
import { getPermissions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const permissions = await getPermissions();
  const allSessions = await db.query.classSessions.findMany({
    with: {
      subject: true,
      lectureLog: true,
      attendance: true,
    },
    orderBy: [desc(classSessions.sessionDate)],
  });

  const hasSessions = allSessions.length > 0;

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Lecture Logs</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Access faculty session summaries, review topics covered, and track attendance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateSessions && (
            <Link className={`text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer`} href="/sessions/new">
              <Plus className="h-3.5 w-3.5" /> Log Session
            </Link>
          )}
        </div>
      </div>

      {!hasSessions ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Logs Available</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No lecture logs have been published yet. Faculty session notes, covered topics, and attendance records will appear here after each completed class.
          </p>
          {permissions.canCreateSessions && (
            <div className="pt-2">
              <Link href="/sessions/new" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> Log First Session
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
            <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground font-fira-sans">Session History</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-border/30">
                {allSessions.map((session) => {
                  const presentCount = session.attendance.filter(a => a.status === 'present').length;
                  const absentCount = session.attendance.filter(a => a.status === 'absent').length;
                  const hasLog = !!session.lectureLog;
                  
                  return (
                    <tr key={session.id} className="hover:bg-muted/20 transition-colors group relative cursor-pointer">
                      <td className="px-6 py-5 w-48 align-top">
                        <Link href={`/sessions/${session.id}`} className="absolute inset-0 z-0 cursor-pointer">
                          <span className="sr-only">View Session</span>
                        </Link>
                        <div className="flex flex-col gap-1 relative z-10 pointer-events-none">
                          <span className="font-medium text-foreground font-fira-sans">
                            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(new Date(session.sessionDate))}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 align-top relative z-10 pointer-events-none">
                        <h4 className="font-semibold text-foreground mb-1">{session.subject?.name}</h4>
                        {hasLog ? (
                          <div className="flex items-start gap-2 text-muted-foreground max-w-md">
                            <FileText className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                            <p className="text-sm line-clamp-2 leading-relaxed font-medium" title={session.lectureLog?.topicsCovered || ""}>
                              {session.lectureLog?.topicsCovered}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted/50 rounded-md inline-block">No log attached</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-5 align-top relative z-10 pointer-events-none w-64">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Attendance</span>
                            <span className="text-foreground font-medium">{presentCount} / {presentCount + absentCount}</span>
                          </div>
                          <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-muted/40">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(presentCount / (presentCount + absentCount || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 align-top text-right w-16 relative z-10">
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto group-hover:translate-x-1 duration-200" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
