
const fs = require("fs");
const path = "src/app/(student)/today/page.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldCode = `  const [dayRoutines, loggedSessions, permissions, deadlines, navBadges] = await Promise.all([
    db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    }),
    db.query.classSessions.findMany({
      where: and(
        gte(classSessions.sessionDate, dayStart),
        lt(classSessions.sessionDate, dayEnd)
      ),
    }),
    getPermissions(),
    getTodayDeadlines(),
    getNavBadges(),
  ]);

  const routinesWithStatus = dayRoutines.map((routine) => {`;

const newCode = `  const [dayRoutinesRaw, loggedSessions, permissions, deadlines, navBadges] = await Promise.all([
    db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    }),
    db.query.classSessions.findMany({
      where: and(
        gte(classSessions.sessionDate, dayStart),
        lt(classSessions.sessionDate, dayEnd)
      ),
    }),
    getPermissions(),
    getTodayDeadlines(),
    getNavBadges(),
  ]);

  let dayRoutines = dayRoutinesRaw;
  if (isClassMember && classContext && classContext.semester != null) {
    const semesterRoman = toRoman(classContext.semester);
    dayRoutines = dayRoutinesRaw.filter((r) => r.subject?.semester === semesterRoman);
  } else if (role === "TEACHER" && user.teacherId) {
    dayRoutines = dayRoutinesRaw.filter(
      (r) => r.subject?.teacherId === user.teacherId || r.teacherName === user.name
    );
  } else if (!isClassMember && role !== "TEACHER") {
    // ADMIN sees all routines, or fallback
  }

  const routinesWithStatus = dayRoutines.map((routine) => {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content, "utf-8");

