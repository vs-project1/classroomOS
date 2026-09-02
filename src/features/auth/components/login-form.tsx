"use client";

import { useActionState } from "react";
import { loginAction, AuthActionResult } from "@/features/auth/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, Loader2 } from "lucide-react";

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    message:
      initialError === "deactivated"
        ? "Your account is deactivated. Please contact college administration."
        : undefined,
  } as AuthActionResult);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

      {/* Error Alert */}
      {state?.message && (
        <div
          role="alert"
          data-testid="login-error"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{state.message}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Email Address
        </Label>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="student@classroom.edu.np"
            autoComplete="email"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Password
          </Label>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all mt-2 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
