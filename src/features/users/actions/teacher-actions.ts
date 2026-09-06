"use server";

import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";

export type TeacherActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    phone?: string[];
    faculties?: string[];
    semesters?: string[];
  };
};

import { PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

const TeacherSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.union([
    z.string().trim().toLowerCase().email("Invalid email address"),
    z.literal("").transform(() => null),
    z.null(),
    z.undefined()
  ]),
  phone: z.union([
    z.string().trim().refine((val) => {
      try {
        const number = phoneUtil.parseAndKeepRawInput(val, 'NP'); // Default to Nepal if no country code provided
        return phoneUtil.isValidNumber(number);
      } catch {
        return false;
      }
    }, "Invalid phone number"),
    z.literal("").transform(() => null),
    z.null(),
    z.undefined()
  ]),
  faculties: z.array(z.string()).default([]),
  semesters: z.array(z.string()).default([]),
});

export async function saveTeacher(prevState: TeacherActionState, formData: FormData): Promise<TeacherActionState> {
  await requireAuth(["ADMIN"]);

  const id = formData.get("id")?.toString();
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    faculties: formData.getAll("faculties"),
    semesters: formData.getAll("semesters"),
  };

  const validatedFields = TeacherSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    const { users } = await import("@/db/schema");
    if (id) {
      const existing = await db.query.teachers.findFirst({
        where: eq(teachers.id, id),
      });

      await db.transaction(async (tx) => {
        await tx.update(teachers)
          .set({
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            faculties: data.faculties,
            semesters: data.semesters,
            updatedAt: new Date(),
          })
          .where(eq(teachers.id, id));

        const targetUserId = existing?.userId;
        if (targetUserId && data.email) {
          await tx.update(users).set({ email: data.email, updatedAt: new Date() }).where(eq(users.id, targetUserId));
        } else if (existing?.email && data.email && existing.email !== data.email) {
          const matchingUser = await tx.query.users.findFirst({ where: eq(users.email, existing.email) });
          if (matchingUser) {
            await tx.update(users).set({ email: data.email, updatedAt: new Date() }).where(eq(users.id, matchingUser.id));
            await tx.update(teachers).set({ userId: matchingUser.id }).where(eq(teachers.id, id));
          }
        }
      });
      revalidatePath("/admin/teachers");
      revalidatePath("/admin/accounts");
      revalidatePath("/teacher");
    } else {
      await db.insert(teachers).values({
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        faculties: data.faculties,
        semesters: data.semesters,
      });
      revalidatePath("/admin/teachers");
    }
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A teacher with this email already exists." };
    }
    console.error("Failed to save teacher:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }

    revalidatePath("/admin/teachers");
    revalidatePath("/admin/subjects");
    revalidatePath("/subjects");
    revalidatePath("/routine");
    redirect("/admin/teachers");
}

export async function deleteTeacher(id: string): Promise<TeacherActionState> {
  await requireAuth(["ADMIN"]);

  try {
    await db.delete(teachers).where(eq(teachers.id, id));
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/subjects");
    revalidatePath("/subjects");
    revalidatePath("/routine");
    return { success: true, message: "Teacher deleted successfully." };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete teacher:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
