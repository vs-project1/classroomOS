import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RoutineNewRedirectPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (user.role === "ADMIN") {
    redirect("/admin/routine/new");
  }

  if (user.role === "TEACHER") {
    redirect("/teacher/routine/new");
  }

  redirect("/routine");
}
