import { db } from "@/db";
import { teachers } from "@/db/schema";
import { asc, like, or, eq, and } from "drizzle-orm";
import { TeacherForm } from "./teacher-form";
import { DeleteTeacherButton } from "./delete-button";
import { EditTeacherDialog } from "./edit-teacher-dialog";
import { Users, GraduationCap, Mail, Phone, Calendar } from "lucide-react";
import { getPermissions } from "@/lib/auth";
import { SearchFilterBar } from "@/components/admin/search-filter-bar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeachersPage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;
  
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : "";
  const semester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : "";

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(teachers.name, `%${search}%`),
        like(teachers.email, `%${search}%`)
      )
    );
  }
  if (semester) {
    conditions.push(like(teachers.semesters, `%${semester}%`));
  }

  const allTeachers = await db
    .select()
    .from(teachers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(teachers.name));
  
  const hasTeachers = allTeachers.length > 0 || search !== "" || semester !== "";

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Teachers</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage teaching staff profiles, department assignments, and contact information across all BCA semesters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canManageSubjects && (
            <div className="flex items-center">
              <TeacherForm />
            </div>
          )}
        </div>
      </div>
      
      {hasTeachers && <SearchFilterBar />}

      {!hasTeachers ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Teachers Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No teaching staff have been onboarded yet. Add faculty members to begin assigning them to core modules and lab practicals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allTeachers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No teachers found matching your search criteria.
            </div>
          ) : (
            allTeachers.map((teacher) => (
              <div key={teacher.id} className="group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary font-fira-sans">{teacher.name[0]}</span>
                  </div>
                  {permissions.canManageSubjects && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm p-1 rounded-md">
                      <EditTeacherDialog teacher={teacher} />
                      <DeleteTeacherButton id={teacher.id} />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold font-fira-sans text-foreground leading-tight mb-1">
                  {teacher.name}
                </h3>
                
                <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                  {teacher.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 opacity-60 shrink-0" />
                      <a href={`mailto:${teacher.email}`} className="truncate hover:text-primary transition-colors">{teacher.email}</a>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 opacity-60 shrink-0" />
                      <span className="font-fira-code">{teacher.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border/50 bg-muted/5 flex flex-wrap gap-2">
                {teacher.faculties && teacher.faculties.length > 0 ? (
                  teacher.faculties.map(f => (
                    <span key={f} className="text-xs uppercase tracking-wider font-bold text-secondary-foreground bg-secondary px-2.5 py-1 rounded-md border border-secondary-foreground/10">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">No departments assigned</span>
                )}
                {teacher.semesters && teacher.semesters.length > 0 && (
                  teacher.semesters.map(s => (
                    <span key={s} className="text-xs uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                      Sem {s}
                    </span>
                  ))
                )}
              </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
