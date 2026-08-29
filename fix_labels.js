
const fs = require("fs");

// 1. Fix CR Dashboard Buttons
let crDash = fs.readFileSync("src/app/(cr)/cr/page.tsx", "utf-8");
crDash = crDash.replace(
  `<ClipboardList className="w-4 h-4" /> Log Session`,
  `<Users className="w-4 h-4" /> Take Attendance`
);
fs.writeFileSync("src/app/(cr)/cr/page.tsx", crDash, "utf-8");

// 2. Fix CR Sidebar Navigation
let crNav = fs.readFileSync("src/lib/navigation/cr.ts", "utf-8");
crNav = crNav.replace(
  `{ label: "Log Session", href: "/cr/log-session", icon: ClipboardEdit }`,
  `{ label: "Take Attendance", href: "/cr/log-session", icon: ClipboardEdit }`
);
crNav = crNav.replace(
  `{ label: "Log Session", href: "/cr/log-session", icon: ClipboardEdit }`,
  `{ label: "Take Attendance", href: "/cr/log-session", icon: ClipboardEdit }`
);
fs.writeFileSync("src/lib/navigation/cr.ts", crNav, "utf-8");

