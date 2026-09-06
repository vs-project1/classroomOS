import crypto from "node:crypto";

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  return "classroom-os-secret-key-32-chars-long-demo";
}

/**
 * Derives the stable server-side identifier for a session token.
 * Stores only this SHA-256 digest — the raw bearer token is never persisted.
 */
export function getSessionTokenId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SessionTokenPayload {
  userId: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  mustChangePassword: boolean;
  expiresAt: number;
}

/**
 * Signs a session payload using Node.js crypto HMAC-SHA256.
 * Format: `${userId}.${role}.${mustChangePassword ? 1 : 0}.${expiresAt}.${signatureHex}`
 */
export function createSessionToken(
  payload: SessionTokenPayload,
  secret?: string
): string {
  const resolvedSecret = secret || getSessionSecret();
  const { userId, role, mustChangePassword, expiresAt } = payload;
  const mcpFlag = mustChangePassword ? "1" : "0";
  const data = `${userId}.${role}.${mcpFlag}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", resolvedSecret).update(data).digest("hex");
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a session token using Node.js crypto.
 * Returns decoded payload if valid and unexpired, or null otherwise.
 */
export function verifySessionToken(
  token: string,
  secret?: string
): SessionTokenPayload | null {
  const resolvedSecret = secret || getSessionSecret();
  if (!token || typeof token !== "string") return null;

  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const payload = token.substring(0, lastDotIndex);
  const signatureHex = token.substring(lastDotIndex + 1);

  const parts = payload.split(".");
  if (parts.length !== 4) return null;

  const [userId, role, mcpStr, expStr] = parts;
  const expiresAt = Number(expStr);

  if (!userId || !role || isNaN(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;

  if (
    role !== "ADMIN" &&
    role !== "TEACHER" &&
    role !== "CR" &&
    role !== "STUDENT"
  ) {
    return null;
  }

  try {
    const expectedSignature = crypto.createHmac("sha256", resolvedSecret).update(payload).digest("hex");
    const sigBuffer = Buffer.from(signatureHex, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    return {
      userId,
      role: role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      mustChangePassword: mcpStr === "1",
      expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Edge-compatible Web Crypto HMAC-SHA256 verification function for Next.js Edge Middleware.
 */
export async function verifySessionTokenEdge(
  token: string,
  secret?: string
): Promise<SessionTokenPayload | null> {
  // 1. Try standard Node.js crypto first if available
  try {
    const nodeResult = verifySessionToken(token, secret);
    if (nodeResult) return nodeResult;
  } catch {
    // Fall through to WebCrypto in pure edge environments
  }

  const resolvedSecret = secret || getSessionSecret();
  if (!token || typeof token !== "string") return null;

  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const payload = token.substring(0, lastDotIndex);
  const signatureHex = token.substring(lastDotIndex + 1);

  const parts = payload.split(".");
  if (parts.length !== 4) return null;

  const [userId, role, mcpStr, expStr] = parts;
  const expiresAt = Number(expStr);

  if (!userId || !role || isNaN(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;

  if (
    role !== "ADMIN" &&
    role !== "TEACHER" &&
    role !== "CR" &&
    role !== "STUDENT"
  ) {
    return null;
  }

  try {
    const subtleCrypto =
      (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) ||
      (crypto as unknown as { webcrypto?: { subtle: SubtleCrypto } })?.webcrypto?.subtle ||
      (crypto as unknown as { subtle?: SubtleCrypto })?.subtle;

    if (!subtleCrypto) {
      return verifySessionToken(token, secret);
    }

    const encoder = new TextEncoder();
    const key = await subtleCrypto.importKey(
      "raw",
      encoder.encode(resolvedSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const match = signatureHex.match(/.{1,2}/g);
    if (!match) return null;
    const signatureBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));

    const isValid = await subtleCrypto.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );

    if (!isValid) return null;

    return {
      userId,
      role: role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      mustChangePassword: mcpStr === "1",
      expiresAt,
    };
  } catch {
    return null;
  }
}
