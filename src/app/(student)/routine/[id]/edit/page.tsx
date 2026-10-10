import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RoutineEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  const { id } = await params;

  if (user.role === "ADMIN") {
    redirect(`/admin/routine/${id}/edit`);
  }

  if (user.role === "TEACHER") {
    redirect(`/teacher/routine/${id}/edit`);
  }

  redirect("/routine");
}
