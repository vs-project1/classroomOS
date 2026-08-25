import { createClient } from "@libsql/client";
const c = createClient({ url: "file:local.test.db" });
for (let tbl of ["users","student_profiles","subjects","enrollments"]) {
  let rr = await c.execute(`SELECT * FROM ${tbl} LIMIT 5`);
  console.log(`\n=== ${tbl} ===`);
  console.log(JSON.stringify(rr.rows,null,2));
}
let r2 = await c.execute("SELECT * FROM course_units LIMIT 5");
console.log(JSON.stringify(r2.rows,null,2));
