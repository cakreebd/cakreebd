import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

type BkashConfig = {
  baseUrl: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  encryptionKey: Buffer;
};

type ProviderTokenResponse = {
  id_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  statusCode?: unknown;
  statusMessage?: unknown;
};

let tokenRefresh: Promise<string> | null = null;

function getConfig(): BkashConfig {
  const baseUrl = process.env.BKASH_API_BASE_URL?.replace(/\/+$/, "");
  const username = process.env.BKASH_USERNAME;
  const password = process.env.BKASH_PASSWORD;
  const appKey = process.env.BKASH_APP_KEY;
  const appSecret = process.env.BKASH_APP_SECRET;
  const rawEncryptionKey = process.env.BKASH_TOKEN_ENCRYPTION_KEY;
  if (!baseUrl || !username || !password || !appKey || !appSecret || !rawEncryptionKey) {
    throw new Error("bKash checkout is not configured. Set its server-side credentials and token-encryption key.");
  }

  const endpoint = new URL(baseUrl);
  const allowedHosts = ["tokenized.sandbox.bka.sh", "tokenized.pay.bka.sh"];
  if (
    endpoint.protocol !== "https:" ||
    !allowedHosts.includes(endpoint.hostname) ||
    endpoint.pathname !== "/v2/tokenized-checkout"
  ) {
    throw new Error("BKASH_API_BASE_URL must be the documented bKash tokenized-checkout HTTPS endpoint.");
  }
  const encryptionKey = Buffer.from(rawEncryptionKey, "base64");
  if (encryptionKey.byteLength !== 32 || encryptionKey.toString("base64") !== rawEncryptionKey) {
    throw new Error("BKASH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return { baseUrl, username, password, appKey, appSecret, encryptionKey };
}

export function isBkashConfigured() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

function encrypt(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${ciphertext.toString("base64")}`;
}

function decrypt(value: string, key: Buffer) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored bKash token is malformed.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function providerRequest(path: string, body: object, headers: Record<string, string> = {}) {
  const { baseUrl } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload: unknown = await response.json();
  if (!response.ok || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`bKash API request failed with HTTP ${response.status}.`);
  }
  const result = payload as Record<string, unknown>;
  if (
    (typeof result.statusCode === "string" && result.statusCode !== "0000") ||
    typeof result.externalCode === "string" ||
    typeof result.errorCode === "string"
  ) {
    const providerMessage = typeof result.statusMessage === "string"
      ? result.statusMessage
      : typeof result.errorMessageEn === "string" ? result.errorMessageEn : "Provider rejected the request.";
    throw new Error(`bKash API rejected the request: ${providerMessage}`);
  }
  return result;
}

async function issueToken(refreshToken?: string) {
  const config = getConfig();
  const credentials = {
    username: config.username,
    password: config.password,
    "X-APP-Key": config.appKey,
  };
  const payload = await providerRequest(
    refreshToken ? "/auth/refresh-token" : "/auth/grant-token",
    {
      app_key: config.appKey,
      app_secret: config.appSecret,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    },
    credentials,
  ) as ProviderTokenResponse;
  if (typeof payload.id_token !== "string" || typeof payload.refresh_token !== "string") {
    throw new Error("bKash did not return an access and refresh token.");
  }
  const expirySeconds = typeof payload.expires_in === "string" || typeof payload.expires_in === "number"
    ? Number(payload.expires_in)
    : 3600;
  if (!Number.isFinite(expirySeconds) || expirySeconds < 60) {
    throw new Error("bKash returned an invalid token expiry.");
  }
  const expiresAt = new Date(Date.now() + expirySeconds * 1000 - 5 * 60 * 1000);
  await prisma.paymentProviderToken.upsert({
    where: { id: "bkash" },
    create: {
      id: "bkash",
      accessToken: encrypt(payload.id_token, config.encryptionKey),
      refreshToken: encrypt(payload.refresh_token, config.encryptionKey),
      expiresAt,
    },
    update: {
      accessToken: encrypt(payload.id_token, config.encryptionKey),
      refreshToken: encrypt(payload.refresh_token, config.encryptionKey),
      expiresAt,
    },
  });
  return payload.id_token;
}

export async function getBkashAccessToken() {
  if (tokenRefresh) return tokenRefresh;
  tokenRefresh = (async () => {
    const config = getConfig();
    const saved = await prisma.paymentProviderToken.findUnique({ where: { id: "bkash" } });
    if (saved && saved.expiresAt > new Date()) {
      return decrypt(saved.accessToken, config.encryptionKey);
    }
    if (saved) {
      const refreshToken = decrypt(saved.refreshToken, config.encryptionKey);
      return issueToken(refreshToken);
    }
    return issueToken();
  })();
  try {
    return await tokenRefresh;
  } finally {
    tokenRefresh = null;
  }
}

export async function createBkashPayment(input: {
  payerReference: string;
  callbackURL: string;
  amount: string;
  merchantInvoiceNumber: string;
}) {
  const config = getConfig();
  const authorization = await getBkashAccessToken();
  const response = await providerRequest("/payment/create", {
    payerReference: input.payerReference,
    callbackURL: input.callbackURL,
    amount: input.amount,
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: input.merchantInvoiceNumber,
  }, { Authorization: authorization, "X-APP-Key": config.appKey });
  if (
    typeof response.paymentId !== "string" ||
    typeof response.bkashURL !== "string"
  ) {
    throw new Error("bKash did not return a checkout link.");
  }
  const checkoutUrl = new URL(response.bkashURL);
  if (!["sandbox.payment.bkash.com", "payment.bkash.com"].includes(checkoutUrl.hostname)) {
    throw new Error("bKash returned an unexpected checkout host.");
  }
  return { paymentId: response.paymentId, checkoutUrl: checkoutUrl.toString() };
}

export async function executeBkashPayment(paymentId: string) {
  const config = getConfig();
  const authorization = await getBkashAccessToken();
  return providerRequest("/payment/execute", { paymentID: paymentId }, {
    Authorization: authorization,
    "X-APP-Key": config.appKey,
  });
}

export async function queryBkashPayment(paymentId: string) {
  const config = getConfig();
  const authorization = await getBkashAccessToken();
  return providerRequest("/query/payment", { paymentId }, {
    Authorization: authorization,
    "X-APP-Key": config.appKey,
  });
}
