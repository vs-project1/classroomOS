
const fs = require("fs");
const path = "src/app/(student)/today/page.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldBlock = `  const [dayRoutines, loggedSessions, permissions, deadlines, navBadges] = await Promise.all([
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

  const routinesWithStatus = dayRoutines.map((routine) => {`.replace(/\n/g, "\r\n");

const newBlock = `  // Fetch student profile for fallback
  let profile = null;
  if (isClassMember && user.studentProfileId) {
    profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });
  }

  const [dayRoutinesRaw, loggedSessions, permissions, deadlines, navBadges] = await Promise.all([
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
  if (isClassMember && profile && profile.semester != null) {
    const semesterRoman = toRoman(profile.semester);
    dayRoutines = dayRoutinesRaw.filter((r) => r.subject?.semester === semesterRoman);
  } else if (role === "TEACHER" && user.teacherId) {
    dayRoutines = dayRoutinesRaw.filter(
      (r) => r.subject?.teacherId === user.teacherId || r.teacherName === user.name
    );
  }

  const routinesWithStatus = dayRoutines.map((routine) => {`.replace(/\n/g, "\r\n");

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content, "utf-8");

