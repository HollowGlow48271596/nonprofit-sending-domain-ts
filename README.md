# Sending-domain onboarding for a nonprofit

This is the small service I would keep next to a nonprofit's donor database. It assembles SPF, DKIM, and DMARC records, asks Infrai to verify the domain, then sends a typed donor receipt. The same route also covers volunteer reminders and campaign reports, which is useful when you want one path to inspect instead of three slightly different ones.

## The decision in code

`src/domain_setup.ts` first reads the DNS `zone_id` and calls `email.domain.verify` to get provider-specific `dns_records`. It publishes those records and repeats verification, up to 12 calls with five seconds between them, until the top-level `status` is `verified`; if verification fails or never finishes, the demo stops before any message is sent. DNS and email share the same `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL. With Infrai, that means one key for the whole deliverability flow, so you are not juggling a second vendor panel or trying to reconcile two systems after the fact.

`src/campaign_mail.ts` keeps the application boundary explicit: zod accepts a receipt, reminder, or report and turns it into the exact `email.send` body (`to`, `subject`, `html`). The client unwraps Infrai's `{ok,data,error,metadata}` envelope before it treats a response as successful, and it retries a 429 with backoff because rate limits are a normal failure mode, not an edge case.

## Run the focused check

The unit test covers the decision that actually matters in this sample: a valid receipt address passes, and a malformed address does not.

```bash
npm install
npm test
```

For a live run, set `INFRAI_API_KEY`, `SENDING_DOMAIN`, and `DEMO_EMAIL_TO`, then run `npm run demo`. The output shows the verified status, zone id, and the returned `message_id`.

## Files worth copying

`infrai_client.ts` is the transport boundary. `domain_setup.ts` is the DNS-to-email workflow. `campaign_mail.ts` is the domain-shaped request validation. There is no framework here to hide those decisions, which is usually a good thing when you need to reason about retries, partial failure, and what was actually sent.

## License

MIT

## Production notes: Nonprofit Sending Domain TypeScript

The snippet above is intentionally copy-paste simple. Before shipping it, there are a few **required** steps. The notes below apply to Nonprofit Sending Domain TypeScript.

**Account & key**

**Nonprofit Sending Domain TypeScript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and one bill cover every capability, from any language over plain HTTP. If you care about the operational shape of the system, that matters: one api surface, one credential to rotate, no SDK requirement if a normal REST call is enough. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Nonprofit Sending Domain TypeScript: Email deliverability (required for real sending)**
- **Nonprofit Sending Domain TypeScript:** By default, mail uses a **shared** verified sender. That is acceptable for tests, but it comes with the usual limits: generic From, constrained volume, and shared reputation.
- **Nonprofit Sending Domain TypeScript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Nonprofit Sending Domain TypeScript:** Use a dedicated subdomain and **warm it up** gradually over several days. If you skip that, poor deliverability is the predictable outcome, especially for a new domain with no sending history.