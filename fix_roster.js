
const fs = require("fs");
const path = "src/app/(teacher)/teacher/attendance/roster/page.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldEnrolledCode = `  // Get enrolled students
  const enrolled = await db
    .select({
      student: students,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(students.rollNumber);`;

const newEnrolledCode = `  // Get enrolled students
  let enrolled = await db
    .select({
      student: students,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(students.rollNumber);

  if (enrolled.length === 0) {
    const allStds = await db
      .select()
      .from(students)
      .orderBy(students.rollNumber);
    enrolled = allStds.map((s) => ({ student: s }));
  }`;

content = content.replace(oldEnrolledCode.replace(/\n/g, "\r\n"), newEnrolledCode.replace(/\n/g, "\r\n"));
fs.writeFileSync(path, content, "utf-8");

