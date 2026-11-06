import assert from "node:assert/strict";
import { campaignMessage } from "./campaign_mail.js";

const valid = campaignMessage.parse({ kind: "receipt", to: "donor@example.org", donor: "Mina", amountCents: 1800 });
assert.equal(valid.kind, "receipt");
assert.throws(() => campaignMessage.parse({ kind: "receipt", to: "not-an-email", donor: "Mina", amountCents: 1800 }));
console.log("campaign input decision: valid receipt accepted, malformed address rejected");

const { infrai } = await import("./infrai_client.js");
const { onboardSendingDomain } = await import("./domain_setup.js");
const originalGet = infrai.dns.domain.get;
const originalVerify = infrai.email.domain.verify;
const originalUpsert = infrai.dns.record.upsert;
try {
  const writes: unknown[] = [];
  let calls = 0;
  infrai.dns.domain.get = async () => ({ zone_id: "test-zone" });
  infrai.email.domain.verify = async () => ({
    status: ++calls === 3 ? "verified" : "pending_dns",
    dns_records: [{ type: "TXT", name: "provider._domainkey.example.org", value: "provider-key", ttl_recommended: 600 }]
  });
  infrai.dns.record.upsert = async (payload) => { writes.push(payload); };
  assert.equal((await onboardSendingDomain("example.org", { pollIntervalMs: 0 })).verification, "verified");
  assert.equal(calls, 3);
  assert.deepEqual(writes[0], {
    zone_id: "test-zone", record_type: "TXT", name: "provider._domainkey.example.org", content: "provider-key", ttl: 600
  });
  infrai.email.domain.verify = async () => ({ status: "failed", dns_records: [] });
  await assert.rejects(onboardSendingDomain("example.org"), /verification failed/);
  infrai.email.domain.verify = async () => ({ status: "pending_dns", dns_records: [] });
  await assert.rejects(onboardSendingDomain("example.org", { maxAttempts: 2, pollIntervalMs: 0 }), /after 2 attempts/);
} finally {
  infrai.dns.domain.get = originalGet;
  infrai.email.domain.verify = originalVerify;
  infrai.dns.record.upsert = originalUpsert;
}
console.log("domain onboarding: provider records, top-level status, polling and failure checks passed");
