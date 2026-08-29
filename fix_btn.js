
const fs = require("fs");
const path = "src/app/(cr)/cr/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `<CheckCircle className="w-4 h-4" /> My Attendance`,
  `<CheckCircle2 className="w-4 h-4" /> My Attendance`
);

fs.writeFileSync(path, content, "utf-8");

