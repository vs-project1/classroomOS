
const fs = require("fs");
const path = "src/app/(student)/homework/page.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldCode = `  let enrolledSubjectIds: string[] = [];
  if (studentId) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
  }`;

const newCode = `  let enrolledSubjectIds: string[] = [];
  if (studentId) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);

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

