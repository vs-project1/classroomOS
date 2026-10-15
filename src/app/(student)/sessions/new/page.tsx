import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SessionsNewRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth(["CR", "TEACHER", "ADMIN"]);
  const params = await searchParams;

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") {
      search.set(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((val) => search.append(k, val));
    }
  }
  const queryString = search.toString() ? `?${search.toString()}` : "";

  if (user.role === "CR") {
    redirect(`/cr/log-session${queryString}`);
  }

  if (user.role === "TEACHER") {
    redirect(`/teacher/sessions/new${queryString}`);
  }

  if (user.role === "ADMIN") {
    redirect(`/admin/sessions/new${queryString}`);
  }

  redirect(`/today`);
}
