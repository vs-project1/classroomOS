
const fs = require("fs");
const path = "src/app/(teacher)/teacher/subjects/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `href={\`/teacher/subjects/\${subject.slug}\`}`,
  `href={\`/subjects/\${subject.slug}\`}`
);

fs.writeFileSync(path, content, "utf-8");

