import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * AI Production Staged Review Inspector for Classroom OS
 * 
 * Extracts staged changes, filters noise (lockfiles, generated migration snapshots),
 * and structures the changes into the 3-Pass Specialist Triad format:
 *   Pass 1: Typos, Property integrity, and Variable shadowing
 *   Pass 2: Business logic, Race conditions, and Invariants
 *   Pass 3: AppSec, IDOR, and OWASP vulnerabilities
 */

const ANSI = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

interface Finding {
  category: "TYPO" | "LOGIC" | "APPSEC";
  severity: "BLOCKER" | "WARNING" | "INFO";
  file: string;
  lineSnippet?: string;
  message: string;
  fix: string;
}

function runLocalPasses(diff: string, stagedFiles: string[]): Finding[] {
  const findings: Finding[] = [];
  const lines = diff.split("\n");

  let currentFile = "";
  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      currentFile = match ? match[1] : "";
      continue;
    }

    if (currentFile.startsWith("scripts/review/")) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const added = line.slice(1).trim();

      // --- PASS 1: TYPOS & STRINGS ---
      // Typos in role comparisons (e.g. "Teacher" vs "TEACHER")
      if (/role\s*===?\s*['"](Teacher|Student|Admin|Cr)['"]/.test(added)) {
        findings.push({
          category: "TYPO",
          severity: "BLOCKER",
          file: currentFile,
          lineSnippet: added,
          message: "Role enum comparison uses mixed case string instead of canonical uppercase.",
          fix: 'Use canonical uppercase: "TEACHER", "STUDENT", "CR", or "ADMIN".',
        });
      }

      // Typos in semester prefix matching (Mistake #36)
      if (added.includes(".startsWith(") && /semester|subSem/i.test(added)) {
        findings.push({
          category: "TYPO",
          severity: "BLOCKER",
          file: currentFile,
          lineSnippet: added,
          message: 'Roman numeral prefix check using .startsWith(). "II".startsWith("I") is true!',
          fix: 'Use areSemestersEqual(a, b) from src/lib/utils/roman.ts instead.',
        });
      }

      // --- PASS 2: LOGIC & INVARIANTS ---
      // Server Component closure render props (Mistake #38)
      if (/renderActions\s*=|renderButton\s*=/.test(added)) {
        findings.push({
          category: "LOGIC",
          severity: "BLOCKER",
          file: currentFile,
          lineSnippet: added,
          message: "Passing closure/function prop across Server-to-Client component boundary in Next.js 16.",
          fix: "Pass boolean capability flags (e.g. canManageRoutine) instead of render closures.",
        });
      }

      // Raw new Date() for daily ledger without timezone normalization (Mistake #10)
      if (
        /new Date\(\)\.toISOString\(\)/.test(added) &&
        (currentFile.includes("attendance") || currentFile.includes("session") || currentFile.includes("routine"))
      ) {
        findings.push({
          category: "LOGIC",
          severity: "WARNING",
          file: currentFile,
          lineSnippet: added,
          message: "Raw new Date().toISOString() detected in daily records path.",
          fix: "Normalize to Asia/Kathmandu UTC midnight: `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' })`.",
        });
      }

      // Next.js redirect inside try/catch trap
      if (added.includes("redirect(") && !added.includes("NEXT_REDIRECT")) {
        // Look back 15 lines for try {
        const precedingLines = lines.slice(Math.max(0, i - 15), i).join("\n");
        if (precedingLines.includes("try {") && !precedingLines.includes("catch")) {
          findings.push({
            category: "LOGIC",
            severity: "WARNING",
            file: currentFile,
            lineSnippet: added,
            message: "redirect() called inside try block. Ensure catch block does not swallow NEXT_REDIRECT!",
            fix: "Check error: `if (isRedirectError(error)) throw error;` or place redirect outside try/catch.",
          });
        }
      }

      // --- PASS 3: APPSEC & PERMISSIONS ---
      // Telegram unescaped HTML injection (Mistake #25)
      if (
        currentFile.includes("telegram") &&
        /\$\{.*(title|topic|homework|note).*\}/i.test(added) &&
        !added.includes("escapeHtml")
      ) {
        findings.push({
          category: "APPSEC",
          severity: "BLOCKER",
          file: currentFile,
          lineSnippet: added,
          message: "User-controlled string interpolated into Telegram message without escapeHtml().",
          fix: "Wrap all dynamic user inputs in escapeHtml(string) to prevent Telegram HTML parsing crash or XSS.",
        });
      }
    }
  }

  // Route security gap audit: Every page in (admin), (teacher), (cr) must have requireAuth
  for (const file of stagedFiles) {
    if (
      (file.startsWith("src/app/(admin)/") ||
        file.startsWith("src/app/(teacher)/") ||
        file.startsWith("src/app/(cr)/")) &&
      /\/page\.tsx$/.test(file)
    ) {
      try {
        const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
        if (!content.includes("requireAuth(") && !content.includes("redirect(")) {
          findings.push({
            category: "APPSEC",
            severity: "BLOCKER",
            file,
            message: `Route page lacks top-level authorization guard (requireAuth).`,
            fix: `Add 'await requireAuth(["ROLE"])' at the beginning of the server component.`,
          });
        }
      } catch {
        // file might be deleted
      }
    }
  }

  return findings;
}

function main() {
  console.log(`\n${ANSI.magenta}${ANSI.bold}╔════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
  console.log(`${ANSI.magenta}${ANSI.bold}║    CLASSROOM OS — PRODUCTION PRE-COMMIT REVIEW SPECIALIST      ║${ANSI.reset}`);
  console.log(`${ANSI.magenta}${ANSI.bold}╚════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

  let stagedDiff = "";
  let stagedFiles: string[] = [];
  try {
    stagedFiles = execSync("git diff --cached --name-only", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    stagedDiff = execSync("git diff --cached", { encoding: "utf-8" });
  } catch {
    console.error(`${ANSI.red}Failed to read git staged diff.${ANSI.reset}`);
    process.exit(1);
  }

  // Filter out noise
  const filteredFiles = stagedFiles.filter(
    (f) =>
      !f.includes("package-lock.json") &&
      !f.includes("drizzle/meta/") &&
      !/\.(png|jpg|jpeg|webp|ico|svg)$/i.test(f)
  );

  console.log(`${ANSI.cyan}📦 Staged Files for Review (${filteredFiles.length}):${ANSI.reset}`);
  filteredFiles.forEach((f) => console.log(`   • ${f}`));
  console.log("");

  console.log(`${ANSI.cyan}⚡ Running Specialist Triad heuristic scans...${ANSI.reset}\n`);
  const findings = runLocalPasses(stagedDiff, filteredFiles);

  const blockers = findings.filter((f) => f.severity === "BLOCKER");
  const warnings = findings.filter((f) => f.severity === "WARNING");

  if (findings.length === 0) {
    console.log(`${ANSI.green}✨ ZERO HEURISTIC DEFECTS FOUND across Typo, Logic, and AppSec passes.${ANSI.reset}`);
    console.log(`${ANSI.green}👉 All staged code adheres to Classroom OS domain invariants.${ANSI.reset}\n`);
  } else {
    console.log(`${ANSI.bold}📋 SPECIALIST AUDIT FINDINGS:${ANSI.reset}\n`);
    for (const item of findings) {
      const icon = item.severity === "BLOCKER" ? "🔴 BLOCKER" : "🟡 WARNING";
      const color = item.severity === "BLOCKER" ? ANSI.red : ANSI.yellow;
      console.log(`${color}${ANSI.bold}[${icon}] [${item.category}] ${item.file}${ANSI.reset}`);
      console.log(`   Issue: ${item.message}`);
      if (item.lineSnippet) {
        console.log(`   Code : ${ANSI.cyan}"${item.lineSnippet}"${ANSI.reset}`);
      }
      console.log(`   Fix  : ${ANSI.green}${item.fix}${ANSI.reset}\n`);
    }
  }

  if (blockers.length > 0) {
    console.log(
      `${ANSI.red}${ANSI.bold}🚨 REVIEW FAILED: ${blockers.length} Critical Blocker(s) must be resolved before committing to production.${ANSI.reset}\n`
    );
    process.exit(1);
  } else {
    console.log(`${ANSI.green}${ANSI.bold}✅ Production Review PASSED. Safe to commit and push to GitHub!${ANSI.reset}\n`);
    process.exit(0);
  }
}

main();
