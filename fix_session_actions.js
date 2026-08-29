
const fs = require("fs");
const path = "src/features/sessions/actions/session-actions.ts";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { classSessions, lectureLogs, attendance, subjects, students, homework, enrollments } from "@/db/schema";`,
  `import { classSessions, lectureLogs, attendance, subjects, students, homework, enrollments, studentProfiles } from "@/db/schema";\nimport { toRoman } from "@/lib/utils/roman";`
);

const oldAccessError = `    if (enrolled.length === 0) {
      return "You are not enrolled in this subject.";
    }`;

const newAccessError = `    if (enrolled.length === 0) {
      if (user.studentProfileId) {
        const profile = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.id, user.studentProfileId),
        });
        if (profile && profile.semester != null) {
          const semesterRoman = toRoman(profile.semester);
          const subj = await db.query.subjects.findFirst({
            where: and(eq(subjects.id, subjectId), eq(subjects.semester, semesterRoman)),
          });
          if (subj) return null;
        }
      }
      return "You are not enrolled in this subject.";
    }`;

content = content.replace(oldAccessError, newAccessError);

const oldGetStudents = `  const enrolledStudents = await db
    .select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(asc(students.rollNumber));

  return enrolledStudents;`;

const newGetStudents = `  const enrolledStudents = await db
    .select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(asc(students.rollNumber));

  if (enrolledStudents.length > 0) {
    return enrolledStudents;
  }

  // Fallback: return all active students in the college roster if enrollments are empty
  return db
    .select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber,
    })
    .from(students)
    .orderBy(asc(students.rollNumber));`;

content = content.replace(oldGetStudents, newGetStudents);
fs.writeFileSync(path, content, "utf-8");

