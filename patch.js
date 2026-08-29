const fs = require('fs');
const file = 'src/app/(admin)/admin/students/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const original = 'conditions.push(eq(students.semester, semester));';
const replacement = `const romanToOrdinal: Record<string, string> = {
      "I": "1st Semester",
      "II": "2nd Semester",
      "III": "3rd Semester",
      "IV": "4th Semester",
      "V": "5th Semester",
      "VI": "6th Semester",
      "VII": "7th Semester",
      "VIII": "8th Semester"
    };
    conditions.push(eq(students.semester, romanToOrdinal[semester] || semester));`;

content = content.replace(original, replacement);
fs.writeFileSync(file, content);
