"use client";

import { useState, useActionState } from "react";
import {
  createAccountAction,
  AccountActionState,
} from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";

export function CreateAccountDialog({
  onAccountCreated,
}: {
  onAccountCreated?: (credentials: NonNullable<AccountActionState["credentials"]>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("STUDENT");
  const [resetKey, setResetKey] = useState(0);

  const [state, formAction, isPending] = useActionState(
    async (prev: AccountActionState, formData: FormData) => {
      const result = await createAccountAction(prev, formData);
      if (result.success && result.credentials) {
        setOpen(false);
        setCredOpen(true);
        if (onAccountCreated) {
          onAccountCreated(result.credentials);
        }
      }
      return result;
    },
    { success: false } as AccountActionState
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setResetKey((k) => k + 1);
    setOpen(nextOpen);
  };

  const copyToClipboard = async () => {
    if (!state.credentials) return;
    const text = `Classroom OS Credentials\nName: ${state.credentials.name}\nEmail: ${state.credentials.email}\nRole: ${state.credentials.role}\nTemporary Password: ${state.credentials.temporaryPassword}\n\nPlease sign in and set your permanent password immediately.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 font-semibold shadow-md shadow-primary/20 cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        Create Account
      </Button>

      <Dialog key={resetKey} open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Provision New Account
            </DialogTitle>
            <DialogDescription>
              Create a new student, teacher, or admin account with automatic temporary password.
            </DialogDescription>
          </DialogHeader>

          {state?.message && !state.success && (
            <div
              role="alert"
              className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}

          <form action={formAction} className="space-y-3 mt-1">
            {/* Name and Email in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Aayush Shrestha"
                  required
                  className="h-9 text-sm"
                />
                {state?.fieldErrors?.name && (
                  <p className="text-xs font-medium text-destructive">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. aayush@classroom.edu.np"
                  required
                  className="h-9 text-sm"
                />
                {state?.fieldErrors?.email && (
                  <p className="text-xs font-medium text-destructive">{state.fieldErrors.email[0]}</p>
                )}
              </div>
            </div>

            {/* Role & Roll Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="role" className="text-xs">Account Role</Label>
                <select
                  id="role"
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="STUDENT">Student</option>
                  <option value="CR">Class Representative (CR)</option>
                  <option value="TEACHER">Teacher / Faculty</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {(selectedRole === "STUDENT" || selectedRole === "CR") ? (
                <div className="space-y-1">
                  <Label htmlFor="rollNumber" className="text-xs">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    name="rollNumber"
                    placeholder="e.g. BCA-2024-042"
                    required
                    className="h-9 text-sm"
                  />
                  {state?.fieldErrors?.rollNumber && (
                    <p className="text-xs font-medium text-destructive">
                      {state.fieldErrors.rollNumber[0]}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="98XXXXXXXX"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Student & CR Academic Fields */}
            {(selectedRole === "STUDENT" || selectedRole === "CR") && (
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                <div className="space-y-1">
                  <Label htmlFor="faculty" className="text-xs">Faculty</Label>
                  <select
                    id="faculty"
                    name="faculty"
                    defaultValue="BCA"
                    className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="BCA">BCA</option>
                    <option value="CSIT">CSIT</option>
                    <option value="BIM">BIM</option>
                    <option value="BBM">BBM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="semester" className="text-xs">Semester</Label>
                  <select
                    id="semester"
                    name="semester"
                    defaultValue="4th"
                    className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                    <option value="3rd">3rd Semester</option>
                    <option value="4th">4th Semester</option>
                    <option value="5th">5th Semester</option>
                    <option value="6th">6th Semester</option>
                    <option value="7th">7th Semester</option>
                    <option value="8th">8th Semester</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="section" className="text-xs">Section</Label>
                  <Input
                    id="section"
                    name="section"
                    defaultValue="A"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="font-semibold shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post-Creation Temporary Credentials Dialog */}
      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
              Account Created — Temporary Credentials
            </DialogTitle>
            <DialogDescription>
              The account has been created with temporary login credentials. Please share these securely with the user.
            </DialogDescription>
          </DialogHeader>

          {state?.credentials && (
            <div className="space-y-3 py-1">
              <div className="bg-muted/60 p-3 rounded-xl space-y-1.5 border border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Name:</span>
                  <span className="font-semibold">{state.credentials.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="font-semibold">{state.credentials.email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Role:</span>
                  <span className="font-semibold text-primary">{state.credentials.role}</span>
                </div>
                <div className="pt-1.5 border-t border-border/60">
                  <span className="text-xs text-muted-foreground block mb-1 font-medium">
                    Temporary Password:
                  </span>
                  <div className="flex items-center justify-between bg-background p-2 rounded-lg border border-primary/20">
                    <code
                      data-testid="temp-password-value"
                      data-temp-password
                      className="font-mono text-sm font-bold text-primary tracking-wide select-all"
                    >
                      {state.credentials.temporaryPassword}
                    </code>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Quarantine Active:</strong> User must change this password on initial sign-in.
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={copyToClipboard}
                  className="w-full gap-2 font-semibold shadow-sm cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Credentials
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCredOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
