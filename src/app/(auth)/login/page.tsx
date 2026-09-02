import { Metadata } from "next";
import { Book } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign In — Classroom OS",
  description: "Secure student and faculty academic portal login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl;
  const error = params?.error;

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
          <Book className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Classroom OS
        </h1>
        <p className="text-sm text-muted-foreground">
          Academic Operating System • Student & Faculty Portal
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8">
        <LoginForm callbackUrl={callbackUrl} initialError={error} />
      </div>

      {/* Security Notice Footer */}
      <p className="text-center text-xs text-muted-foreground/75 px-4">
        Public registration is disabled. Student and faculty accounts are provisioned exclusively by college administration.
      </p>
    </div>
  );
}
