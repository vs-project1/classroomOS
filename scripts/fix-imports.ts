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

walkDir('src', (f) => {
  if (!f.endsWith('.tsx') && !f.endsWith('.ts')) return;
  
  let c = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  if (c.includes('import {\r\nimport { formatNepaliDate')) {
    c = c.replace('import {\r\nimport { formatNepaliDate', 'import { formatNepaliDate');
    c = c.replace('from "@/lib/nepali-date";\r\n', 'from "@/lib/nepali-date";\r\nimport {\r\n');
    changed = true;
  }
  
  if (c.includes('import {\nimport { formatNepaliDate')) {
    c = c.replace('import {\nimport { formatNepaliDate', 'import { formatNepaliDate');
    c = c.replace('from "@/lib/nepali-date";\n', 'from "@/lib/nepali-date";\nimport {\n');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed:', f);
  }
});
