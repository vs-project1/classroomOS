const fs = require('fs');

function replaceRegex(file, regex, replace) {
  let c = fs.readFileSync(file, 'utf8');
  if (regex.test(c)) {
    c = c.replace(regex, replace);
    
    // Add import
    const importStmt = 'import { formatNepaliDate } from "@/lib/nepali-date";\n';
    if (!c.includes('@/lib/nepali-date')) {
      const importMatches = [...c.matchAll(/^import /gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const endOfLine = c.indexOf('\n', lastMatch.index) + 1;
        c = c.slice(0, endOfLine) + importStmt + c.slice(endOfLine);
      } else {
        c = importStmt + c;
      }
    }
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed', file);
  }
}

replaceRegex('src/app/(admin)/admin/attendance/page.tsx', /req\.sessionDate\.toLocaleDateString\([^)]*\)/, 'formatNepaliDate(req.sessionDate)');
replaceRegex('src/app/(admin)/admin/students/page.tsx', /new Date\(student\.createdAt\)\.toLocaleDateString\([^)]*\)/, 'formatNepaliDate(student.createdAt)');
replaceRegex('src/app/(teacher)/teacher/grading/grading-form.tsx', /new Date\(submission\.submittedAt\)\.toLocaleDateString\(\)/, 'formatNepaliDate(submission.submittedAt)');
replaceRegex('src/components/gradebook/grade-grid.tsx', /new Date\(iso\)\.toLocaleDateString\([^)]*\)/, 'formatNepaliDate(iso)');
replaceRegex('src/features/attendance/components/month-picker.tsx', /d\.toLocaleDateString\([^)]*\)/, 'formatNepaliDate(d, "YYYY MMMM")');

