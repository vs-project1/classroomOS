import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, students, teachers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PhoneForm, PasswordForm } from "./profile-forms";
import { toRoman } from "@/lib/utils/roman";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Bot, Shield, User, GraduationCap, School } from "lucide-react";

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
      const legacy = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      phone = profile.phone ?? legacy?.phone ?? null;
      academicRows = [
        ["Roll number", profile.rollNumber],
        ["Faculty", profile.faculty],
        [
          "Semester",
          profile.semester != null
            ? `${profile.semester}th Semester (${toRoman(profile.semester)})`
                .replace("1th", "1st")
                .replace("2th", "2nd")
                .replace("3th", "3rd")
            : null,
        ],
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
    academicRows = [
      ["Access level", "Full Administrative Access"],
      ["Primary console", "Classroom OS Admin Portal"],
      ["Password policy", "Enforced with rotation audit"],
      ["Account state", "Active Administrator"],
    ];
  }

  const roleTitle =
    user.role === "ADMIN"
      ? "System Role & Permissions"
      : user.role === "TEACHER"
      ? "Faculty Assignment Details"
      : "Academic Details";

  const roleSubtitle =
    user.role === "ADMIN"
      ? "Full administrative access and authority across Classroom OS."
      : user.role === "TEACHER"
      ? "Assigned faculties, courses, and teacher profile details."
      : "Maintained by college administration. Contact the coordinator to correct anything wrong.";

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-12">
      {/* Page Header */}
      <div className="space-y-1 pb-2 border-b border-border/40">
        <h1 className="text-2xl sm:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account credentials, security preferences, and administrative integrations.
        </p>
      </div>

      {/* Identity Card */}
      <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20 shadow-xs shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initialsOf(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {user.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`rounded-full font-semibold px-2.5 py-0.5 text-xs ${
                      roleBadgeClass[user.role] ?? ""
                    }`}
                  >
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">{user.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic / Role Details Card */}
      <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-muted text-foreground border border-border/50">
              {user.role === "ADMIN" ? (
                <Shield className="w-4 h-4 text-primary" />
              ) : user.role === "TEACHER" ? (
                <GraduationCap className="w-4 h-4 text-primary" />
              ) : (
                <School className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold font-fira-sans text-foreground">
                {roleTitle}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {roleSubtitle}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {academicRows.map(([label, value]) => (
              <div
                key={label}
                className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block font-fira-code">
                  {label}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {value?.trim() ? value : <span className="text-muted-foreground font-normal">—</span>}
                </p>
              </div>
            ))}
          </div>

          {(user.role === "STUDENT" || user.role === "CR") && (
            <p className="text-xs text-muted-foreground pt-4">
              Email is used as your sign-in identity and cannot be changed here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin Integrations Card */}
      {user.role === "ADMIN" && (
        <Card className="rounded-2xl border border-primary/25 bg-primary/5 shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-fira-sans text-foreground">
                      Telegram Bot Integration
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Automate morning (5:30 AM) and evening (8:00 PM) timetable briefings and broadcast routine updates directly to semester groups.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/settings/telegram"
                className={buttonVariants({ variant: "default", size: "sm" }) + " shrink-0 font-semibold gap-1.5 shadow-xs cursor-pointer"}
              >
                Configure Bot & Channels →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable contact */}
      {(user.role === "STUDENT" || user.role === "CR" || user.role === "TEACHER") && (
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base sm:text-lg font-bold font-fira-sans text-foreground">
              Contact Preferences
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              The one field you can update yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <PhoneForm currentPhone={phone} />
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden" id="password">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base sm:text-lg font-bold font-fira-sans text-foreground">
            Security & Credentials
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Update your password. All other sessions are signed out afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
