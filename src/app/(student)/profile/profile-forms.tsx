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
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword" className="text-xs font-semibold text-foreground">
            Current password
          </Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="h-10 rounded-xl text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
            New password
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 rounded-xl text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
            Confirm new password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 rounded-xl text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "rounded-xl font-semibold px-5 cursor-pointer shadow-xs",
            })}
          >
            {pending ? "Updating…" : "Update Password"}
          </button>
          <Feedback state={state} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Changing your password signs you out of all other active sessions.
        </p>
      </div>
    </form>
  );
}
