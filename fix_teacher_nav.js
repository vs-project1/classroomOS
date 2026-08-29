
const fs = require("fs");
const path = "src/lib/navigation/teacher.ts";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(
  `import { Book, CheckCircle, ClipboardCheck, FileText, FolderOpen, Home, Inbox, Clock } from "lucide-react";`,
  `import { Book, CalendarRange, CheckCircle, ClipboardCheck, FileText, FolderOpen, Home, Inbox, Clock } from "lucide-react";`
);

content = content.replace(
  `{ label: "My Subjects", href: "/teacher/subjects", icon: Book },`,
  `{ label: "My Subjects", href: "/teacher/subjects", icon: Book },\n        { label: "Routine", href: "/teacher/routine", icon: CalendarRange },`
);

fs.writeFileSync(path, content, "utf-8");

