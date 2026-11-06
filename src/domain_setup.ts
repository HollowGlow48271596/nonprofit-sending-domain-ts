import { infrai } from "./infrai_client.js";

export type DomainSetup = { domain: string; zoneId: string; verification: string };

export async function onboardSendingDomain(
  domain: string,
  options: { maxAttempts?: number; pollIntervalMs?: number } = {}
): Promise<DomainSetup> {
  const { maxAttempts = 12, pollIntervalMs = 5000 } = options;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || !Number.isFinite(pollIntervalMs) || pollIntervalMs < 0) {
    throw new Error("Invalid verification polling options");
  }
  const zone = await infrai.dns.domain.get(domain);
  let checked = await infrai.email.domain.verify(domain);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (checked.status === "verified") {
      return { domain, zoneId: zone.zone_id, verification: checked.status };
    }
    if (checked.status === "failed" || checked.status === "expired") {
      throw new Error(`Domain verification ${checked.status}: ${domain}`);
    }
    if (attempt === maxAttempts - 1) break;
    for (const record of checked.dns_records) {
      await infrai.dns.record.upsert({
        zone_id: zone.zone_id,
        record_type: record.type,
        name: record.name,
        content: record.value,
        ...(record.ttl_recommended === undefined ? {} : { ttl: record.ttl_recommended }),
        ...(record.priority === undefined ? {} : { priority: record.priority })
      });
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    checked = await infrai.email.domain.verify(domain);
  }
  throw new Error(`Domain verification still ${checked.status} after ${maxAttempts} attempts: ${domain}`);
}
