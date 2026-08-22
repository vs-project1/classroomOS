import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, students, teachers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PhoneForm, PasswordForm } from "./profile-forms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Profile — Classroom OS",
};

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right font-medium">{value?.trim() ? value : <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

const roleBadgeClass: Record<string, string> = {
  STUDENT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  CR: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  TEACHER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  ADMIN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let academicRows: [string, string | null | undefined][] = [];
  let phone: string | null = null;

  if ((user.role === "STUDENT" || user.role === "CR") && user.studentProfileId) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });
    if (profile) {
      // Legacy registry row (same student, keyed by roll number).
      const legacy = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      phone = profile.phone ?? legacy?.phone ?? null;
      academicRows = [
        ["Roll number", profile.rollNumber],
        ["Faculty", profile.faculty],
        ["Semester", profile.semester != null ? String(profile.semester) : null],
        ["Section", profile.section],
        ["Batch year", profile.batchYear != null ? String(profile.batchYear) : null],
        ["Registry name", legacy?.name ?? null],
      ];
    }
  } else if (user.role === "TEACHER") {
    const teacher = user.email
      ? await db.query.teachers.findFirst({ where: eq(teachers.email, user.email) })
      : undefined;
    if (teacher) {
      phone = teacher.phone ?? null;
      academicRows = [
        ["Name", teacher.name],
        ["Email (registry)", teacher.email],
        ["Phone (registry)", teacher.phone],
        ["Faculties", teacher.faculties?.join(", ") ?? null],
        ["Semesters", teacher.semesters?.join(", ") ?? null],
      ];
    } else {
      academicRows = [["Status", "Account not yet linked to a teacher profile"]];
    }
  } else if (user.role === "ADMIN") {
    academicRows = [["Access level", "Full administrative access"], ["Password policy", "Rotation enforced at first login"]];
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Identity card */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-1 ring-border/50">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initialsOf(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight truncate">{user.name}</h1>
                <Badge variant="outline" className={`rounded-full ${roleBadgeClass[user.role] ?? ""}`}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic details */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Academic details</CardTitle>
          <CardDescription>Maintained by college administration. Contact the coordinator to correct anything wrong.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-1" />
          {academicRows.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
          {user.role === "STUDENT" || user.role === "CR" ? (
            <p className="text-xs text-muted-foreground pt-2">Email is used as your sign-in identity and cannot be changed here.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Editable contact */}
      {(user.role === "STUDENT" || user.role === "CR" || user.role === "TEACHER") && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Contact preferences</CardTitle>
            <CardDescription>The one field you can update yourself.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneForm currentPhone={phone} />
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card className="rounded-2xl" id="password">
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>Update your password. All other sessions are signed out afterwards.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
