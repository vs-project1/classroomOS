import { db } from "@/db";
import { students } from "@/db/schema";
import { StudentForm } from "./student-form";
import { EditStudentDialog } from "./edit-student-dialog";
import { asc, like, or, eq, and } from "drizzle-orm";
import { Users, GraduationCap, Search, FileDown } from "lucide-react";
import { getPermissions } from "@/lib/auth";
import { SearchFilterBar } from "@/components/admin/search-filter-bar";
import { formatNepaliDate } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;
  
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : "";
  const semester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : "";

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(students.name, `%${search}%`),
        like(students.email, `%${search}%`),
        like(students.rollNumber, `%${search}%`)
      )
    );
  }
  if (semester) {
    conditions.push(eq(students.semester, semester));
  }

  const allStudents = await db
    .select()
    .from(students)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(students.rollNumber));

  const hasStudents = allStudents.length > 0 || search !== "" || semester !== "";

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Students</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage enrolled scholars, track academic standing, and update contact information across all semesters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasStudents && (
            <button className="text-xs font-medium px-3 py-1.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1" title="Export current student registry to CSV for external processing.">
              <FileDown className="w-3.5 h-3.5" /> Export Roster
            </button>
          )}
          {permissions.canManageSubjects && (
            <div className="flex items-center">
              <StudentForm />
            </div>
          )}
        </div>
      </div>
      
      {hasStudents && <SearchFilterBar />}

      {!hasStudents ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Students Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No students are currently enrolled in the system. Add individual student records or bulk-import a CSV roster to begin tracking attendance and grades.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
            <h3 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground font-fira-code">Active Scholars</h3>
            <span className="text-xs font-bold tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20" title="Total number of actively enrolled students across all faculties.">
              {allStudents.length} Registered
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-fira-sans">
                <tr>
                  <th className="px-6 py-3 border-b">Roll No.</th>
                  <th className="px-6 py-3 border-b">Scholar Name</th>
                  <th className="px-6 py-3 border-b">Contact</th>
                  <th className="px-6 py-3 border-b">Academic Profile</th>
                  <th className="px-6 py-3 border-b text-right">Enrolled</th>
                  <th className="w-16 border-b"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {allStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No students found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  allStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 align-top">
                      <span className="font-fira-code text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-foreground font-fira-sans">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground font-medium">
                        {student.email ? (
                          <span className="truncate max-w-[200px]" title={student.email}>{student.email}</span>
                        ) : (
                          <span className="italic opacity-50">No email</span>
                        )}
                        {student.phone ? (
                          <span className="font-fira-code">{student.phone}</span>
                        ) : (
                          <span className="italic opacity-50">No phone</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                          {student.faculty || "BCA"}
                        </span>
                        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border">
                          Sem {student.semester || "1"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right text-xs text-muted-foreground font-fira-code">
                      {formatNepaliDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      {permissions.canManageSubjects && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                          <EditStudentDialog student={student} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
