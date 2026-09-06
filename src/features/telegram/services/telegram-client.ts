import "server-only";
import type { TelegramBotInfo } from "../types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function getBotInfo(botToken: string): Promise<{
  ok: boolean;
  result?: TelegramBotInfo;
  error?: string;
}> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getMe`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `HTTP ${res.status}: Failed to authenticate with Telegram`,
      };
    }

    return {
      ok: true,
      result: data.result as TelegramBotInfo,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error contacting Telegram",
    };
  }
}

export type SendMessageOptions = {
  token: string;
  chatId: string;
  text: string;
  messageThreadId?: number | null;
  pinMessage?: boolean;
};

export async function sendTelegramMessage({
  token,
  chatId,
  text,
  messageThreadId,
  pinMessage = false,
}: SendMessageOptions): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
}> {
  try {
    const body: Record<string, any> = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    };

    if (messageThreadId) {
      body.message_thread_id = messageThreadId;
    }

    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `HTTP ${res.status}: Failed to send message`,
      };
    }

    const messageId = data.result?.message_id as number | undefined;

    // Pin message if requested
    if (pinMessage && messageId) {
      await pinTelegramMessage(token, chatId, messageId);
    }

    return {
      ok: true,
      messageId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error delivering Telegram message",
    };
  }
}

export async function pinTelegramMessage(
  token: string,
  chatId: string,
  messageId: number
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        disable_notification: false,
      }),
      cache: "no-store",
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
