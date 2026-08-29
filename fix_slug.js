
const fs = require("fs");
const path = "src/app/(student)/subjects/[slug]/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";`,
  `import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";\nimport { toRoman } from "@/lib/utils/roman";\nimport { studentProfiles } from "@/db/schema";`
);

const oldEnrollmentCheck = `    if (!enrollment) {`;

const newEnrollmentCheck = `    let isAllowedBySemester = false;
    if (!enrollment && user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile && profile.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        if (subject.semester === semesterRoman) {
          isAllowedBySemester = true;
        }
      }
    }

    if (!enrollment && !isAllowedBySemester) {`;

content = content.replace(oldEnrollmentCheck, newEnrollmentCheck);
fs.writeFileSync(path, content, "utf-8");

