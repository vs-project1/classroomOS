
import { db } from "./src/db";
import { users, students, studentProfiles, enrollments, subjects } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers.map(u => ({ email: u.email, role: u.role })));
  
  const allProfiles = await db.select().from(studentProfiles);
  console.log("Student Profiles:", allProfiles);
  
  const allStudents = await db.select().from(students);
  console.log("Students:", allStudents);

  const subjs = await db.select().from(subjects);
  console.log("Subjects semesters:", subjs.map(s => ({ name: s.name, sem: s.semester })));
  
  process.exit(0);
}

main();

