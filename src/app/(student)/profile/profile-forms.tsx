"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { updatePhoneAction, type UpdatePhoneResult } from "./actions";
import { changePasswordAction } from "@/features/auth/actions/auth";

const initialState: UpdatePhoneResult = { success: false };

function Feedback({ state }: { state: UpdatePhoneResult }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-xs font-medium ${state.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
    >
      {state.message}
    </p>
  );
}

export function PhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const [state, formAction, pending] = useActionState(updatePhoneAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Contact phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={currentPhone ?? ""}
          placeholder="+977-98XXXXXXXX"
          maxLength={24}
          className="h-11 max-w-sm rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          Visible to college administration only. Email and academic details are admin-managed.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-xl cursor-pointer" })}
        >
          {pending ? "Saving…" : "Save phone"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-xl cursor-pointer" })}
        >
          {pending ? "Updating…" : "Change password"}
        </button>
        <Feedback state={state} />
      </div>
      <p className="text-xs text-muted-foreground">Changing your password signs you out everywhere else.</p>
    </form>
  );
}
