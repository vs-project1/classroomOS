import { createClient } from "@libsql/client";
const c = createClient({ url: "file:local.db" });
let r = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log(r.rows.map(x=>x.name).join(", "));
for (let tbl of ["users","student_profiles","subjects","course_units","course_chapters","course_materials","resources","enrollments","sessions"]) {
  try {
    let rr = await c.execute(`SELECT * FROM ${tbl} LIMIT 3`);
    console.log(`\n=== ${tbl} (${rr.rows.length}) ===`);
    console.log(JSON.stringify(rr.rows,null,2));
    let cols = await c.execute(`PRAGMA table_info(${tbl})`);
    console.log(`Cols: ${cols.rows.map(c=>c.name).join(", ")}`);
  } catch(e) { console.log(e.message)}
}
