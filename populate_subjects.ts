import { db } from "./src/db/client";
import { subjects } from "./src/db/schema";
import crypto from "crypto";

const data = [
  { semester: "I", subjects: [
    { name: "Computer Fundamentals and Applications", code: "BCA 101" },
    { name: "Programming in C", code: "BCA 102" },
    { name: "Digital Logic", code: "BCA 103" },
    { name: "Mathematics I", code: "BCA 104" },
    { name: "Professional Communication and Ethics", code: "BCA 105" },
    { name: "Hardware Workshop", code: "BCA 106" }
  ]},
  { semester: "II", subjects: [
    { name: "Discrete Structure", code: "BCA 151" },
    { name: "Microprocessor and Computer Architecture", code: "BCA 152" },
    { name: "OOP in Java", code: "BCA 153" },
    { name: "Mathematics II", code: "BCA 154" },
    { name: "UX/UI Design", code: "BCA 155" },
    { name: "Principles of Management", code: "BCA 156" }
  ]},
  { semester: "III", subjects: [
    { name: "Data Structure and Algorithms", code: "BCA 201" },
    { name: "Database Management System", code: "BCA 202" },
    { name: "Web Technology I", code: "BCA 203" },
    { name: "System Analysis and Design", code: "BCA 204" },
    { name: "Probability and Statistics", code: "BCA 205" },
    { name: "Applied Economics", code: "BCA 206" }
  ]},
  { semester: "IV", subjects: [
    { name: "Operating Systems", code: "BCA 251" },
    { name: "Software Engineering", code: "BCA 252" },
    { name: "Numerical Methods", code: "BCA 253" },
    { name: "Python Programming", code: "BCA 254" },
    { name: "Web Technology II", code: "BCA 255" },
    { name: "Project I", code: "BCA 256" }
  ]},
  { semester: "V", subjects: [
    { name: "Computer Network", code: "BCA 301" },
    { name: "Artificial Intelligence", code: "BCA 302" },
    { name: "Advance Java Programming", code: "BCA 303" },
    { name: "MIS and e-Business", code: "BCA 304" },
    { name: "Society and Technology", code: "BCA 305" },
    { name: "Project II", code: "BCA 306" }
  ]},
  { semester: "VI", subjects: [
    { name: "Computer Graphics and Animation", code: "BCA 351" },
    { name: "Mobile Programming", code: "BCA 352" },
    { name: "Cryptography and Network Security", code: "BCA 353" },
    { name: "Technical Writing", code: "BCA 354" },
    { name: "Distributed System", code: "BCA 355" },
    { name: "Project III", code: "BCA 356" }
  ]},
  { semester: "VII", subjects: [
    { name: "Cyber Security and Ethical Hacking", code: "BCA 401" },
    { name: "Software Project Management", code: "BCA 402" },
    { name: "Financial Accounting", code: "BCA 403" },
    { name: "Project IV", code: "BCA 404" },
    { name: "Elective I", code: "BCA 405" },
    { name: "Elective II", code: "BCA 406" }
  ]},
  { semester: "VIII", subjects: [
    { name: "Cloud Computing", code: "BCA 451" },
    { name: "Internship", code: "BCA 452" },
    { name: "Elective III", code: "BCA 453" },
    { name: "Elective IV", code: "BCA 454" }
  ]}
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
  let count = 0;
  for (const sem of data) {
    for (const sub of sem.subjects) {
      const slug = slugify(sub.name);
      await db.insert(subjects).values({
        id: crypto.randomUUID(),
        name: sub.name,
        code: sub.code,
        semester: sem.semester,
        slug: slug,
      }).onConflictDoNothing();
      count++;
    }
  }
  console.log(`Inserted ${count} subjects.`);
}

run();
