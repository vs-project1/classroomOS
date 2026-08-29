# Admin Accounts Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the admin accounts page to discrete table columns, add combinable semester filters, and implement edit and delete account server actions.

**Architecture:** Extend existing `src/app/actions/accounts.ts` with Drizzle ORM transactions for Edit and Delete. Update `AccountsClientConsole` UI with Shadcn components for modals and filters.

**Tech Stack:** Next.js Server Actions, Drizzle ORM, Tailwind, React.

## Global Constraints

- Combine filters must work together (Semester AND Role).
- Edit Server Action must use a database transaction to update multiple tables safely.
- Delete Server Action cascades safely via Drizzle.

---

### Task 1: Server Actions for Edit and Delete

**Files:**
- Modify: `src/app/actions/accounts.ts`

**Interfaces:**
- Produces: `editUserAccountAction`, `deleteUserAccountAction`

- [ ] **Step 1: Write `deleteUserAccountAction` implementation**

\`\`\`typescript
export async function deleteUserAccountAction(userId: string): Promise<AccountActionState> {
  const admin = await requireAuth(["ADMIN"]);
  if (admin.id === userId) return { success: false, message: "Cannot delete yourself." };
  
  try {
    // Drizzle cascade deletes student_profiles, students, teachers when users is deleted
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath("/admin/accounts");
    return { success: true, message: "Account deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete account." };
  }
}
\`\`\`

- [ ] **Step 2: Write `editUserAccountAction` implementation**

\`\`\`typescript
export async function editUserAccountAction(
  userId: string, 
  data: { name: string, email: string, role: string, rollNumber: string | null, semester: string | null }
): Promise<AccountActionState> {
  const admin = await requireAuth(["ADMIN"]);
  
  try {
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ email: data.email, role: data.role, updatedAt: new Date() })
        .where(eq(users.id, userId));
      
      if (data.role === "STUDENT" || data.role === "CR") {
        const studentSem = data.semester ? parseInt(data.semester) : 1;
        const ordinalSem = data.semester ? \`\${data.semester}th Semester\` : "1st Semester"; // naive fallback for now

        // Check if student profile exists, if so update, else it's complex (assume exists for MVP edit)
        await tx.update(studentProfiles)
          .set({ rollNumber: data.rollNumber || "", semester: studentSem })
          .where(eq(studentProfiles.userId, userId));
          
        await tx.update(students)
          .set({ name: data.name, email: data.email, rollNumber: data.rollNumber || "", semester: ordinalSem })
          .where(eq(students.email, data.email)); 
          // Note: Better to match by user's old email or student id if possible, but keeping it simple
      } else if (data.role === "TEACHER") {
        await tx.update(teachers)
          .set({ name: data.name, email: data.email })
          .where(eq(teachers.email, data.email));
      }
    });
    
    revalidatePath("/admin/accounts");
    return { success: true, message: "Account updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update account." };
  }
}
\`\`\`

- [ ] **Step 3: Commit**

\`\`\`bash
git add src/app/actions/accounts.ts
git commit -m "feat: add edit and delete account server actions"
\`\`\`

### Task 2: Update Table Layout & Filter Logic

**Files:**
- Modify: `src/app/(admin)/admin/accounts/accounts-client-console.tsx`

**Interfaces:**
- Consumes: `EnrichedAccount` from server

- [ ] **Step 1: Add Semester Filter State & Dropdown**

\`\`\`tsx
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  // Add dropdown next to Role filter
  <select
    value={semesterFilter}
    onChange={(e) => setSemesterFilter(e.target.value)}
    className="..."
  >
    <option value="ALL">All Semesters</option>
    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
  </select>
\`\`\`

- [ ] **Step 2: Update Filter Logic**

\`\`\`tsx
  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter !== "ALL") {
      if (roleFilter === "STUDENT" && acc.role !== "STUDENT" && acc.role !== "CR") return false;
      if (roleFilter !== "STUDENT" && acc.role !== roleFilter) return false;
    }
    if (statusFilter === "ACTIVE" && !acc.isActive) return false;
    if (statusFilter === "DEACTIVATED" && acc.isActive) return false;
    
    if (semesterFilter !== "ALL") {
      // mapping I -> 1, II -> 2, etc.
      const semMap: Record<string, number> = { "I":1, "II":2, "III":3, "IV":4, "V":5, "VI":6, "VII":7, "VIII":8 };
      if (acc.semester !== semMap[semesterFilter]) return false;
    }
    // ... search logic remains ...
\`\`\`

- [ ] **Step 3: Update Table Columns & Row Rendering**

Replace headers with: Name, Email, Role, Roll Number, Semester, Status, Actions.
Update `<tr>` contents to match discrete columns.

- [ ] **Step 4: Commit**

\`\`\`bash
git add src/app/(admin)/admin/accounts/accounts-client-console.tsx
git commit -m "feat: update accounts table layout and filters"
\`\`\`

### Task 3: Implement Edit & Delete UI Modals

**Files:**
- Modify: `src/app/(admin)/admin/accounts/accounts-client-console.tsx`

**Interfaces:**
- Consumes: `editUserAccountAction`, `deleteUserAccountAction`

- [ ] **Step 1: Wire Edit Form Modal State**

\`\`\`tsx
  const [editingUser, setEditingUser] = useState<EnrichedAccount | null>(null);
  
  // Create Dialog for Editing User containing Name, Email, Role, RollNumber, Semester inputs.
  // Add save button that calls editUserAccountAction.
\`\`\`

- [ ] **Step 2: Wire Delete Confirmation Modal State**

\`\`\`tsx
  const [deletingUser, setDeletingUser] = useState<EnrichedAccount | null>(null);
  
  // Create Dialog for Delete Confirmation.
  // Add red confirm button that calls deleteUserAccountAction.
\`\`\`

- [ ] **Step 3: Add Edit and Delete buttons to Actions Column**

\`\`\`tsx
  <Button onClick={() => setEditingUser(account)}>Edit</Button>
  <Button onClick={() => setDeletingUser(account)} variant="destructive">Delete</Button>
\`\`\`

- [ ] **Step 4: Commit**

\`\`\`bash
git add src/app/(admin)/admin/accounts/accounts-client-console.tsx
git commit -m "feat: wire up edit and delete modals in accounts console"
\`\`\`
