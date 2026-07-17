import { db } from "@/db";
import { teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TeacherForm } from "../../teacher-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTeacherPage({ params }: Props) {
  const { id } = await params;

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, id),
  });

  if (!teacher) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/teachers" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Edit Teacher Profile</h2>
      </div>

      <TeacherForm
        defaultValues={{
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || undefined,
          phone: teacher.phone || undefined,
        }}
      />
    </div>
  );
}
