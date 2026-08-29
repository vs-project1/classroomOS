
const fs = require("fs");
const path = "src/app/(teacher)/teacher/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `href="/subjects"`,
  `href="/teacher/subjects"`
);

fs.writeFileSync(path, content, "utf-8");

