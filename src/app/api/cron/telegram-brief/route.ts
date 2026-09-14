import { NextResponse } from "next/server";
import { db } from "@/db";
import { telegramSettings } from "@/db/schema";
import { executeTelegramBrief } from "@/features/telegram/services/telegram-brief-service";

export const dynamic = "force-dynamic";

async function handleTelegramBrief(request: Request) {
  // 1. Authenticate cron trigger
  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken || !settings.isEnabled) {
    return NextResponse.json(
      { ok: false, error: "Telegram Bot is not configured or is currently disabled." },
      { status: 200 }
    );
  }

  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();
  const providedSecret = bearerSecret || querySecret;

  const validSecrets = [process.env.CRON_SECRET, settings.cronSecret].filter(Boolean) as string[];

  // If a cron secret is configured, require a match
  if (validSecrets.length > 0) {
    const isAuthorized = providedSecret && validSecrets.includes(providedSecret);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized: Invalid or missing cron secret. Pass via 'Authorization: Bearer <secret>' or '?secret=<secret>'.",
        },
        { status: 401 }
      );
    }
  }

  // 2. Parse query parameters
  const typeParam = url.searchParams.get("type"); // "morning" | "evening" | null
  const briefType =
    typeParam === "morning" || typeParam === "evening" ? typeParam : undefined;

  const force = url.searchParams.get("force") === "true";
  const semester = url.searchParams.get("semester")?.trim() || undefined;

  // 3. Delegate to core domain service
  const result = await executeTelegramBrief({
    briefType,
    force,
    semester,
    source: "cron",
  });

  return NextResponse.json(result, { status: 200 });
}

export async function GET(request: Request) {
  return handleTelegramBrief(request);
}

export async function POST(request: Request) {
  return handleTelegramBrief(request);
}
