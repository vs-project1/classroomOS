
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("local.db");

console.log("weekly_routine:");
console.log(db.prepare("SELECT * FROM weekly_routine LIMIT 5").all());

