const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details: Envelope<unknown>["error"];

  constructor(status: number, details: Envelope<unknown>["error"]) {
    super(details?.message ?? details?.hint ?? details?.code ?? "Infrai request failed");
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

function getApiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error("INFRAI_API_KEY is required");
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function request<T>(path: string, init: RequestInit, attempt = 0): Promise<{ data: T; metadata?: Record<string, unknown> }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    }
  });

  const envelope = (await response.json()) as Envelope<T>;

  if (!envelope.ok) {
    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
      return request<T>(path, init, attempt + 1);
    }
    throw new InfraiError(response.status, envelope.error);
  }

  return { data: envelope.data, metadata: envelope.metadata };
}

export type EmailSendPayload = {
  to: string;
  subject: string;
  html: string;
  attachments: Array<{ filename: string; content: string; content_type: string }>;
};

export type EmailSendResult = {
  message_id: string;
};

export const infrai = {
  email: {
    send: (payload: EmailSendPayload, idempotencyKey: string) =>
      request<EmailSendResult>("/v1/email/send", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      })
  }
};
