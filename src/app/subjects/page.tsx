import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { SubjectForm } from "./subject-form";
import { asc } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SubjectsPage() {
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
    with: { teacher: true },
  });

  const allTeachers = await db.select().from(teachers).orderBy(asc(teachers.name));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Subjects</h2>
      </div>

      <SubjectForm teachers={allTeachers} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allSubjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No subjects found.
                </TableCell>
              </TableRow>
            ) : (
              allSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.code}</TableCell>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.teacher?.name || "Unassigned"}</TableCell>
                  <TableCell>{new Date(subject.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
