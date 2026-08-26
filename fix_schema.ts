import { db } from './src/db/client';
import { sql } from 'drizzle-orm';
async function main() {
  try { await db.run(sql`ALTER TABLE students ADD COLUMN section text;`); } catch(e){}
  try { await db.run(sql`ALTER TABLE students ADD COLUMN batch_year integer;`); } catch(e){}
  console.log('Done');
}
main();
