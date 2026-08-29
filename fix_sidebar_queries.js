
const fs = require("fs");
const path = "src/features/subjects/queries.ts";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { courseChapters, courseUnits, enrollments, subjects } from "@/db/schema";`,
  `import { courseChapters, courseUnits, enrollments, subjects, studentProfiles } from "@/db/schema";\nimport { toRoman } from "@/lib/utils/roman";`
);

const oldSidebarLogic = `    return db
      .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
      .from(enrollments)
      .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
      .where(eq(enrollments.studentId, student.id))
      .orderBy(asc(subjects.name));`;

const newSidebarLogic = `    const enrolled = await db
      .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
      .from(enrollments)
      .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
      .where(eq(enrollments.studentId, student.id))
      .orderBy(asc(subjects.name));

    if (enrolled.length > 0) {
      return enrolled;
    }

    if (user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile && profile.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        return db
          .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
          .from(subjects)
          .where(eq(subjects.semester, semesterRoman))
          .orderBy(asc(subjects.name));
      }
    }

    return [];`;

content = content.replace(oldSidebarLogic, newSidebarLogic);
fs.writeFileSync(path, content, "utf-8");

