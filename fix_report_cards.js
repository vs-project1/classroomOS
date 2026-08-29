
const fs = require("fs");
const path = "src/app/report-cards/[studentId]/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { attendance, enrollments, exams, examWeights, gradeEntries, gradeScales, students, subjects } from "@/db/schema";`,
  `import { attendance, enrollments, exams, examWeights, gradeEntries, gradeScales, students, subjects, studentProfiles } from "@/db/schema";\nimport { toRoman } from "@/lib/utils/roman";`
);

const oldCode = `  const subjectIds = [...new Set(studentEnrollments.map((e) => e.subjectId))];`;

const newCode = `  let subjectIds = [...new Set(studentEnrollments.map((e) => e.subjectId))];
  if (subjectIds.length === 0) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.rollNumber, student.rollNumber),
    });
    if (profile && profile.semester != null) {
      const semesterRoman = toRoman(profile.semester);
      const mappedSubjects = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.semester, semesterRoman));
      subjectIds = mappedSubjects.map((s) => s.id);
    }
  }`;

content = content.replace(oldCode.replace(/\n/g, "\r\n"), newCode.replace(/\n/g, "\r\n"));
fs.writeFileSync(path, content, "utf-8");

