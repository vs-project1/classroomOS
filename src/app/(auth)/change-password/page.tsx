import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = {
  title: "Set Permanent Password — Classroom OS",
  description: "Mandatory password update required for account security",
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    redirect(user.role === "ADMIN" ? "/admin" : "/");
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set Permanent Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome, <span className="font-semibold text-foreground">{user.name}</span>. Please update your temporary credentials.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8">
        <ChangePasswordForm />
      </div>

      {/* Security Policy Reminder */}
      <div className="text-center text-xs text-muted-foreground/75 px-4 space-y-1">
        <p>Password must be at least 8 characters long.</p>
        <p>This requirement ensures the privacy and integrity of your academic records.</p>
      </div>
    </div>
  );
}
