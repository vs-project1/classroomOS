
const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");
const db = new DatabaseSync("local.db");

// TU 2025 BCA Semester IV Subjects
const newSubjects = [
  { code: "BCA 251", name: "Operating Systems", slug: "operating-systems" },
  { code: "BCA 252", name: "Software Engineering", slug: "software-engineering" },
  { code: "BCA 253", name: "Numerical Methods", slug: "numerical-methods" },
  { code: "BCA 255", name: "Web Technology-II", slug: "web-technology-ii" }
];

const insertSubject = db.prepare("INSERT INTO subjects (id, name, slug, code, semester, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())");

let count = 0;
for (const sub of newSubjects) {
  try {
    insertSubject.run(crypto.randomUUID(), sub.name, sub.slug, sub.code, "IV");
    count++;
  } catch(e) {
    console.log("Skipping " + sub.code + ": " + e.message);
  }
}

console.log("Added " + count + " new subjects to Semester IV!");

