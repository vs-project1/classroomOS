
const fs = require("fs");
const path = "src/app/(cr)/cr/log-session/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `<h1 className="text-2xl font-bold tracking-tight">Log Session</h1>`,
  `<h1 className="text-2xl font-bold tracking-tight">Take Attendance</h1>`
);
fs.writeFileSync(path, content, "utf-8");

