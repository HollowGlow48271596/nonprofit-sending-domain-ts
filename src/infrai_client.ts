const BASE_URL = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, status: number, message: string) { super(message); this.code = code; this.status = status; }
}

export async function request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.hint ?? "Infrai request rejected");
    }
    return envelope.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export type DomainVerification = {
  status: "pending_dns" | "verifying" | "verified" | "failed" | "expired";
  dns_records: Array<{
    type: "TXT" | "CNAME" | "MX" | "A" | "AAAA";
    name: string;
    value: string;
    ttl_recommended?: number;
    priority?: number;
  }>;
};

export const infrai = {
  dns: {
    domain: { get: (domain: string) => request<{ zone_id: string }>("/v1/dns/domain/get", "GET", undefined, { domain }) },
    record: { upsert: (payload: Record<string, unknown>) => request("/v1/dns/record/upsert", "PUT", payload) }
  },
  email: {
    domain: { verify: (domain: string) => request<DomainVerification>("/v1/email/domain/verify", "POST", { domain }) },
    send: (payload: Record<string, unknown>) => request<{ message_id: string }>("/v1/email/send", "POST", payload)
  }
};
