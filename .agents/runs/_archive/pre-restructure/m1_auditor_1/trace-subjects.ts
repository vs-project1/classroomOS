import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { subjects, teachers } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const tchs = await db.select().from(teachers);
  console.log("Teachers in DB:", tchs.map(t => t.id));

  const subjs = await db.select().from(subjects);
  console.log("Subjects currently in DB:", subjs.map(s => ({ id: s.id, code: s.code, teacherId: s.teacherId })));

  const subjectsData = [
    { id: "subj_dbms", name: "Database Management System", code: "CACS251", teacherId: "tch_rajesh_01" },
    { id: "subj_os", name: "Operating Systems", code: "CACS252", teacherId: "tch_sunita_02" },
    { id: "subj_web2", name: "Web Technology II", code: "CACS253", teacherId: "tch_bishal_03" },
    { id: "subj_nm", name: "Numerical Methods", code: "CACS254", teacherId: "tch_anjali_04" },
    { id: "subj_se", name: "Software Engineering", code: "CACS255", teacherId: "tch_rajesh_01" },
  ];

  for (const s of subjectsData) {
    try {
      await db.insert(subjects).values(s);
      console.log(`Successfully inserted subject ${s.id}`);
    } catch (err: any) {
      console.error(`Failed to insert subject ${s.id}:`, err.message);
      if (err.cause) console.error("   Cause:", err.cause);
    }
  }
}

main().catch(console.error);
