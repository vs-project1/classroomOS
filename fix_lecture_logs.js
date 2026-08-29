
const fs = require("fs");
const path = "src/app/(student)/lecture-logs/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { classSessions, enrollments, students } from "@/db/schema";`,
  `import { classSessions, enrollments, students, studentProfiles, subjects } from "@/db/schema";\nimport { toRoman } from "@/lib/utils/roman";`
);

const oldCode = `  if (student) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
    for (const enrollment of userEnrollments) {
      const semesters = semestersBySubjectId.get(enrollment.subjectId) ?? new Set<number>();
      semesters.add(enrollment.semester);
      semestersBySubjectId.set(enrollment.subjectId, semesters);
    }
  }`;

const newCode = `  if (student) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
    for (const enrollment of userEnrollments) {
      const semesters = semestersBySubjectId.get(enrollment.subjectId) ?? new Set<number>();
      semesters.add(enrollment.semester);
      semestersBySubjectId.set(enrollment.subjectId, semesters);
    }

    if (enrolledSubjectIds.length === 0 && user?.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile && profile.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        const mappedSubjects = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.semester, semesterRoman));
        enrolledSubjectIds = mappedSubjects.map((s) => s.id);
      }
    }
  }`;

content = content.replace(oldCode.replace(/\n/g, "\r\n"), newCode.replace(/\n/g, "\r\n"));
fs.writeFileSync(path, content, "utf-8");

