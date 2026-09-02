"use client";

import { useActionState } from "react";
import { changePasswordAction, AuthActionResult } from "@/features/auth/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, ShieldCheck, Loader2 } from "lucide-react";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, {
    success: false,
  } as AuthActionResult);

  return (
    <form action={formAction} className="space-y-4">
      {/* Validation Error Alert */}
      {state?.message && (
        <div
          role="alert"
          data-testid="password-error"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{state.message}</span>
        </div>
      )}

      {/* Current / Temporary Password */}
      <div className="space-y-1.5">
        <Label
          htmlFor="currentPassword"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Current Password
        </Label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.currentPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.currentPassword[0]}
          </p>
        )}
      </div>

      {/* New Password */}
      <div className="space-y-1.5">
        <Label
          htmlFor="newPassword"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          New Permanent Password (min 8 chars)
        </Label>
        <div className="relative">
          <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.newPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.newPassword[0]}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label
          htmlFor="confirmPassword"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Confirm New Password
        </Label>
        <div className="relative">
          <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.confirmPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.confirmPassword[0]}
          </p>
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
            Updating Password...
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </form>
  );
}
