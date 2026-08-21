"use server";

import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, getCurrentUser, invalidateSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export async function loginAction(
  prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl"),
  };

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: "Please provide both a valid email and password.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, callbackUrl } = validated.data;
  let destination = "/";

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        message: "Your account is deactivated. Please contact college administration.",
      };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    await createSession(
      user.id,
      user.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      Boolean(user.mustChangePassword)
    );

    if (user.mustChangePassword) {
      destination = "/change-password";
    } else if (
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.startsWith("/login")
    ) {
      destination = callbackUrl;
    } else if (user.role === "ADMIN") {
      destination = "/admin/accounts";
    } else {
      destination = "/";
    }
  } catch (error) {
    console.error("Login action error:", error);
    return {
      success: false,
      message: "An unexpected error occurred during login. Please try again.",
    };
  }

  redirect(destination);
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match. Please re-enter your confirmation.",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => !data.currentPassword || data.newPassword !== data.currentPassword,
    {
      message: "New password must differ from temporary password.",
      path: ["newPassword"],
    }
  );

export async function changePasswordAction(
  prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const rawData = {
    currentPassword: formData.get("currentPassword")?.toString() || undefined,
    newPassword: formData.get("newPassword")?.toString() || "",
    confirmPassword: formData.get("confirmPassword")?.toString() || "",
  };

  const validated = changePasswordSchema.safeParse(rawData);
  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message;
    return {
      success: false,
      message: firstError || "Invalid password details.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = validated.data;
  let destination = "/";

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!dbUser || !dbUser.isActive) {
      return {
        success: false,
        message: "User account not found or inactive.",
      };
    }

    if (currentPassword) {
      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return {
          success: false,
          message: "Current temporary password is incorrect.",
        };
      }
    }

    const isSameAsOld = await verifyPassword(newPassword, dbUser.passwordHash);
    if (isSameAsOld) {
      return {
        success: false,
        message: "New password must differ from temporary password.",
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    await createSession(
      currentUser.id,
      currentUser.role,
      false
    );

    revalidatePath("/", "layout");
    destination = currentUser.role === "ADMIN" ? "/admin/accounts" : "/";
  } catch (error) {
    console.error("Change password action error:", error);
    return {
      success: false,
      message: "Failed to update password. Please try again.",
    };
  }

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await invalidateSession();
  redirect("/login");
}
