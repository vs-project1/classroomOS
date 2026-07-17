import { db } from "@/db";
import { teachers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeacherForm } from "./teacher-form";
import { DeleteTeacherButton } from "./delete-button";
import { Edit } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const allTeachers = await db.select().from(teachers).orderBy(asc(teachers.name));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Teachers</h2>
      </div>

      <TeacherForm />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No teachers registered yet.
                </TableCell>
              </TableRow>
            ) : (
              allTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.email || "-"}</TableCell>
                  <TableCell>{teacher.phone || "-"}</TableCell>
                  <TableCell>{new Date(teacher.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <Link
                      href={`/teachers/${teacher.id}/edit`}
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                      title="Edit Teacher"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <DeleteTeacherButton id={teacher.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
