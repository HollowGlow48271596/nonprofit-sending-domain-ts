import { onboardSendingDomain } from "./domain_setup.js";
import { sendCampaignMessage } from "./campaign_mail.js";

const domain = process.env.SENDING_DOMAIN;
const recipient = process.env.DEMO_EMAIL_TO;
if (!domain || !recipient) throw new Error("SENDING_DOMAIN and DEMO_EMAIL_TO are required");
const setup = await onboardSendingDomain(domain);
const sent = await sendCampaignMessage({ kind: "receipt", to: recipient, donor: "A donor", amountCents: 2500 });
console.log({ setup, sent });
