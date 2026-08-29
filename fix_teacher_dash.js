
const fs = require("fs");
const path = "src/app/(teacher)/teacher/page.tsx";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `const todayString = formatNepaliDate(today);`,
  `const todayString = new Intl.DateTimeFormat("en-US", options).format(today);`
);

content = content.replace(
  `href="/subjects"\n          className="flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/50 transition-all"`,
  `href="/teacher/subjects"\n          className="flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/50 transition-all"`
);

fs.writeFileSync(path, content, "utf-8");

