"use client";

import { useState, useTransition, FormEvent } from "react";
import {
  toggleAccountStatusAction,
  resetPasswordAction,
  editUserAccountAction,
  deleteUserAccountAction,
  AccountActionState,
} from "@/app/actions/accounts";
import { CreateAccountDialog } from "@/components/admin/create-account-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  UserCheck,
  UserX,
  Copy,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { KPISummaryCards, KPICardsProps } from "./kpi-summary-cards";

export interface EnrichedAccount {
  id: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  phone?: string | null;
  rollNumber?: string | null;
  faculty?: string | null;
  semester?: number | string | null;
  section?: string | null;
  batchYear?: number | null;
  studentId?: string | null;
  teacherId?: string | null;
  faculties?: string[] | null;
  semesters?: string[] | null;
}

interface AccountsClientConsoleProps {
  accounts: EnrichedAccount[];
  kpiStats: KPICardsProps;
  currentUserId: string;
}

export function AccountsClientConsole({
  accounts,
  kpiStats,
  currentUserId,
}: AccountsClientConsoleProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Reset Password Modal state
  const [resetModalUser, setResetModalUser] = useState<EnrichedAccount | null>(null);
  const [resetCredentials, setResetCredentials] = useState<NonNullable<AccountActionState["credentials"]> | null>(null);
  const [copiedReset, setCopiedReset] = useState(false);

  // Edit Modal state
  const [editingUser, setEditingUser] = useState<EnrichedAccount | null>(null);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", role: "", rollNumber: "", semester: "" });

  // Delete Modal state
  const [deletingUser, setDeletingUser] = useState<EnrichedAccount | null>(null);

  const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter !== "ALL") {
      if (roleFilter === "STUDENT" && acc.role !== "STUDENT" && acc.role !== "CR") return false;
      if (roleFilter !== "STUDENT" && acc.role !== roleFilter) return false;
    }
    if (statusFilter === "ACTIVE" && !acc.isActive) return false;
    if (statusFilter === "DEACTIVATED" && acc.isActive) return false;

    if (semesterFilter !== "ALL") {
      if (acc.semester?.toString() !== semesterFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = acc.name.toLowerCase().includes(q);
      const matchEmail = acc.email.toLowerCase().includes(q);
      const matchRoll = acc.rollNumber?.toLowerCase().includes(q);
      const matchFaculty = acc.faculty?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchFaculty) return false;
    }
    return true;
  });

  const handleToggleStatus = (userId: string, email: string) => {
    startTransition(async () => {
      const res = await toggleAccountStatusAction(userId);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || `Status updated for ${email}` });
      } else {
        setActionMessage({ type: "error", text: res.message || "Failed to update status" });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const handleResetPassword = (user: EnrichedAccount) => {
    startTransition(async () => {
      const res = await resetPasswordAction(user.id);
      if (res.success && res.credentials) {
        setResetCredentials(res.credentials);
      } else {
        setActionMessage({ type: "error", text: res.message || "Failed to reset password" });
      }
    });
  };

  const copyResetCredentials = async () => {
    if (!resetCredentials) return;
    const text = `Classroom OS Reset Credentials\nEmail: ${resetCredentials.email}\nTemporary Password: ${resetCredentials.temporaryPassword}\n\nPlease sign in and set your permanent password.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReset(true);
      setTimeout(() => setCopiedReset(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleOpenEdit = (user: EnrichedAccount) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber || "",
      semester: user.semester?.toString() || "",
    });
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmingEdit(true);
  };

  const confirmEdit = () => {
    if (!editingUser) return;
    startTransition(async () => {
      const res = await editUserAccountAction(editingUser.id, editFormData);
      setIsConfirmingEdit(false);
      setEditingUser(null);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Account updated." });
      } else {
        setActionMessage({ type: "error", text: res.message || "Update failed." });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    startTransition(async () => {
      const res = await deleteUserAccountAction(deletingUser.id);
      setDeletingUser(null);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Account deleted." });
      } else {
        setActionMessage({ type: "error", text: res.message || "Delete failed." });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const getRoleBadge = (role: EnrichedAccount["role"]) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold gap-1">
            <Shield className="w-3 h-3" />
            ADMIN
          </Badge>
        );
      case "TEACHER":
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-semibold gap-1">
            <BookOpen className="w-3 h-3" />
            TEACHER
          </Badge>
        );
      case "CR":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1">
            <ShieldCheck className="w-3 h-3" />
            CR
          </Badge>
        );
      case "STUDENT":
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold gap-1">
            <GraduationCap className="w-3 h-3" />
            STUDENT
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Account Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Provision identities, manage roles, and enforce security policies.
          </p>
        </div>
        <CreateAccountDialog />
      </div>

      {/* KPI Metrics Strip */}
      <KPISummaryCards {...kpiStats} />

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          role="alert"
          className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-lg"
          />
        </div>

        {/* Filters */}
        <div className="flex w-full sm:w-auto items-center gap-2">
          {/* Semester Filter */}
          <select
            name="semesterFilter"
            aria-label="Filter by Semester"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>

          {/* Role Filter */}
          <select
            name="roleFilter"
            aria-label="Filter by Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students (incl. CR)</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Administrators</option>
          </select>

          {/* Status Filter */}
          <select
            name="statusFilter"
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DEACTIVATED">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3.5">Name</th>
                <th scope="col" className="px-4 py-3.5">Email</th>
                <th scope="col" className="px-4 py-3.5">Role</th>
                <th scope="col" className="px-4 py-3.5">Roll Number</th>
                <th scope="col" className="px-4 py-3.5">Semester</th>
                <th scope="col" className="px-4 py-3.5">Status</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No accounts matching the search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const isSelf = account.id === currentUserId;
                  return (
                    <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {account.name}
                          {isSelf && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-muted-foreground">{account.email}</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getRoleBadge(account.role)}
                      </td>

                      {/* Roll Number */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-medium text-foreground">
                          {account.rollNumber || "-"}
                        </span>
                      </td>
                      
                      {/* Semester */}
                      <td className="px-4 py-3.5">
                        <span className="text-muted-foreground">
                          {account.semester ? `Sem ${account.semester}` : "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleResetPassword(account)}
                          className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleOpenEdit(account)}
                          className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Edit Account"
                        >
                          <Pencil className="w-3.5 h-3.5 text-sky-500" />
                        </Button>

                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(account.id, account.email)}
                            className={`h-8 px-2.5 text-xs gap-1 cursor-pointer ${
                              account.isActive
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={account.isActive ? "Deactivate" : "Activate"}
                          >
                            {account.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setDeletingUser(account)}
                            className="h-8 px-2.5 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => {
        if (!open) {
          setEditingUser(null);
          setIsConfirmingEdit(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
            <DialogDescription>
              Update user details and access roles.
            </DialogDescription>
          </DialogHeader>
          
          {!isConfirmingEdit ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" required value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select 
                  required
                  value={editFormData.role} 
                  onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background"
                >
                  <option value="STUDENT">Student</option>
                  <option value="CR">Class Representative</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {(editFormData.role === "STUDENT" || editFormData.role === "CR") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Roll Number</label>
                    <Input required value={editFormData.rollNumber} onChange={e => setEditFormData({...editFormData, rollNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Semester</label>
                    <select 
                      required
                      value={editFormData.semester} 
                      onChange={e => setEditFormData({...editFormData, semester: e.target.value})}
                      className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background"
                    >
                      <option value="">Select</option>
                      {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
                <strong>Confirm Changes</strong>
                <p className="mt-1">Are you sure you want to save these changes to {editFormData.email}?</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsConfirmingEdit(false)}>Back</Button>
                <Button onClick={confirmEdit} disabled={isPending}>Confirm Update</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the account for <strong>{deletingUser?.email}</strong> and remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>Delete Account</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog
        open={Boolean(resetCredentials)}
        onOpenChange={(open) => !open && setResetCredentials(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <KeyRound className="w-5 h-5" />
              Password Reset — Temporary Credentials
            </DialogTitle>
            <DialogDescription>
              A new temporary password has been set. The user account is now in quarantine until they establish a new permanent password.
            </DialogDescription>
          </DialogHeader>

          {resetCredentials && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/60 p-4 rounded-xl space-y-2 border border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">User:</span>
                  <span className="font-semibold">{resetCredentials.email}</span>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <span className="text-xs text-muted-foreground block mb-1 font-medium">
                    New Temporary Password:
                  </span>
                  <div className="flex items-center justify-between bg-background p-2.5 rounded-lg border border-primary/20">
                    <code
                      data-testid="temp-password-value"
                      data-temp-password
                      className="font-mono text-sm font-bold text-primary tracking-wide select-all"
                    >
                      {resetCredentials.temporaryPassword}
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyResetCredentials}
                  className="w-full gap-2 font-semibold shadow-sm cursor-pointer"
                >
                  {copiedReset ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Copied!
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
                  onClick={() => setResetCredentials(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
