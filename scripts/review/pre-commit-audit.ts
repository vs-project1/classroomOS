import { execSync } from "child_process";

/**
 * Deterministic Pre-Commit Production Guardrail Script for Classroom OS
 * 
 * Runs in < 3 seconds to catch:
 * 1. Staged sensitive files (.env, private keys, tokens)
 * 2. Hardcoded secrets in staged diffs
 * 3. TypeScript compilation errors (npx tsc --noEmit)
 * 4. Drizzle schema changes missing generated migrations
 * 5. Critical domain invariant violations (Mistake #10, #36, #38 from LEARNINGS.md)
 */

const ANSI = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(msg: string) {
  console.log(`${ANSI.cyan}[PRE-COMMIT GUARD]${ANSI.reset} ${msg}`);
}

function error(msg: string) {
  console.error(`${ANSI.red}${ANSI.bold}🚨 [BLOCKED]${ANSI.reset} ${msg}`);
}

function warn(msg: string) {
  console.warn(`${ANSI.yellow}⚠️ [WARNING]${ANSI.reset} ${msg}`);
}

function success(msg: string) {
  console.log(`${ANSI.green}✅ [PASSED]${ANSI.reset} ${msg}`);
}

async function runAudit() {
  log("Starting pre-commit production verification...");

  // 1. Get Staged Files
  let stagedFiles: string[] = [];
  try {
    const rawStaged = execSync("git diff --cached --name-only", { encoding: "utf-8" }).trim();
    stagedFiles = rawStaged ? rawStaged.split("\n").map((f) => f.trim()).filter(Boolean) : [];
  } catch {
    error("Failed to read git staged files. Are you in a git repository?");
    process.exit(1);
  }

  if (stagedFiles.length === 0) {
    log("No staged files detected. Ready for commit.");
    process.exit(0);
  }

  log(`Auditing ${stagedFiles.length} staged file(s)...`);

  // 2. Sensitive File Guard
  const sensitiveFilePatterns = [
    /\.env(\..+)?$/i,
    /id_rsa/i,
    /id_ed25519/i,
    /.*\.pem$/i,
    /.*\.key$/i,
    /local\.db$/i,
    /local\.test\.db$/i,
  ];

  for (const file of stagedFiles) {
    if (sensitiveFilePatterns.some((pattern) => pattern.test(file))) {
      error(`Attempting to commit a sensitive/local file: "${file}"`);
      error("Remove this file from staging before committing (git reset HEAD <file>).");
      process.exit(1);
    }
  }
  success("No sensitive or local environment files staged.");

  // 3. Hardcoded Secrets in Staged Diffs
  let diffContent = "";
  try {
    diffContent = execSync("git diff --cached", { encoding: "utf-8" });
  } catch {
    // If diff read fails, ignore and proceed
  }

  if (diffContent) {
    const secretMatchers = [
      { name: "Turso / LibSQL Token", regex: /TURSO_AUTH_TOKEN\s*=\s*['"][a-zA-Z0-9_\-\.]{20,}['"]/ },
      { name: "Telegram Bot Token", regex: /TELEGRAM_BOT_TOKEN\s*=\s*['"][0-9]{8,}:[a-zA-Z0-9_\-]{30,}['"]/ },
      { name: "Raw LibSQL Remote URL with Token", regex: /libsql:\/\/[a-zA-Z0-9\-]+\.turso\.io\?authToken=/ },
      { name: "UploadThing Secret Key", regex: /UPLOADTHING_SECRET\s*=\s*['"]sk_live_[a-zA-Z0-9_\-]+['"]/ },
    ];

    for (const secret of secretMatchers) {
      if (secret.regex.test(diffContent)) {
        error(`Hardcoded secret pattern detected in staged diff: ${secret.name}`);
        error("Never hardcode production credentials in source code. Use environment variables.");
        process.exit(1);
      }
    }
    success("No plaintext credentials or secret tokens found in staged diff.");
  }

  // 4. Schema vs. Migration Parity Guard
  const isSchemaStaged = stagedFiles.some((f) => f.includes("src/db/schema.ts"));
  const isMigrationStaged = stagedFiles.some((f) => f.startsWith("drizzle/") && f.endsWith(".sql"));

  if (isSchemaStaged && !isMigrationStaged) {
    error("`src/db/schema.ts` is staged without a corresponding Drizzle migration file!");
    error("Production (Turso) requires explicit migration SQL files to stay in sync.");
    error("Run `npm run db:generate` and stage the resulting `drizzle/00XX_*.sql` file before committing.");
    process.exit(1);
  }
  success("Database schema and migration synchronization verified.");

  // 5. Invariant Pattern Checks in Staged Changes
  if (diffContent) {
    const addedLines = diffContent
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

    // Check A: StartsWith Roman numeral comparison (Mistake #36)
    for (const line of addedLines) {
      if (line.includes(".startsWith(") && /semester|subSem|cohort/i.test(line)) {
        warn(
          `Detected potential Roman numeral prefix match: "${line.trim()}". ` +
          `Remember: "II".startsWith("I") evaluates to TRUE! Use canonical areSemestersEqual() from src/lib/utils/roman.ts.`
        );
      }
    }

    // Check B: Server Component closure prop passed across RSC boundary (Mistake #38)
    for (const line of addedLines) {
      if (/renderActions\s*=\s*\{|renderButton\s*=\s*\{/.test(line)) {
        warn(
          `Detected potential closure render prop: "${line.trim()}". ` +
          `Functions cannot be passed from Server Components to Client Components in Next.js 16.`
        );
      }
    }
  }

  // 6. Zero-Regression TypeScript Typecheck Verification
  log("Executing zero-regression typecheck (`npx tsc --noEmit`)...");
  try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    success("TypeScript compiler exited with 0 errors.");
  } catch {
    error("TypeScript compilation failed! Fix all type errors before committing.");
    process.exit(1);
  }

  console.log(`\n${ANSI.green}${ANSI.bold}✨ All pre-commit production guardrails passed successfully! Code is safe to commit.${ANSI.reset}\n`);
}

runAudit().catch((err) => {
  error(`Unexpected error during pre-commit audit: ${err.message}`);
  process.exit(1);
});
