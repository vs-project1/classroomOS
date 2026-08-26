import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function processFile(filePath: string) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('timezone\\index.ts') || filePath.includes('nepali-date.ts') || filePath.includes('timezone/index.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changed = false;

  // Replace DateTimeFormat usages with formatNepaliDate/formatNepaliDateTime
  const regex1 = /new Intl\.DateTimeFormat\([^)]*\)\.format\(([^)]+)\)/g;
  
  if (regex1.test(content)) {
    content = content.replace(regex1, (match, dateArg) => {
      // EXCLUSIONS
      if (match.includes("dateStyle: 'short'") && match.includes("new Date()")) {
         return match; // used for logic
      }
      if (match.includes("hour: '2-digit'") && match.includes("new Date()") && match.includes("timeZone: 'Asia/Kathmandu'")) {
         return match; // used for logic in nptTime
      }
      if (match.includes("en-US") && match.includes("numeric")) {
         if (match.includes("Intl.DateTimeFormat(\"en-US\", {") && match.includes("timeZone: \"Asia/Kathmandu\"") && match.includes("year: \"numeric\"")) {
             return match; // likely part of nptDateParts or similar logic
         }
      }
      
      if (match.includes("timeStyle: 'short'") || match.includes('hour:')) {
        return `formatNepaliDateTime(${dateArg})`;
      } else {
        return `formatNepaliDate(${dateArg})`;
      }
    });
    
    // Add import if it actually changed something
    if (content !== originalContent) {
        const importStmt = `import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";\n`;
        if (!content.includes('@/lib/nepali-date')) {
          const importMatches = [...content.matchAll(/^import /gm)];
          if (importMatches.length > 0) {
            const lastMatch = importMatches[importMatches.length - 1];
            const endOfLine = content.indexOf('\n', lastMatch.index) + 1;
            content = content.slice(0, endOfLine) + importStmt + content.slice(endOfLine);
          } else {
            content = importStmt + content;
          }
        }
        changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

walkDir('src', processFile);
