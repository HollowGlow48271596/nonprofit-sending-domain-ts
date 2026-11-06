import { z } from "zod";
import { infrai } from "./infrai_client.js";

const receipt = z.object({ kind: z.literal("receipt"), to: z.string().email(), donor: z.string().min(1), amountCents: z.number().int().positive() });
const reminder = z.object({ kind: z.literal("reminder"), to: z.string().email(), volunteer: z.string().min(1), shift: z.string().min(1) });
const report = z.object({ kind: z.literal("report"), to: z.string().email(), campaign: z.string().min(1), totalCents: z.number().int().nonnegative() });
export const campaignMessage = z.discriminatedUnion("kind", [receipt, reminder, report]);
export type CampaignMessage = z.infer<typeof campaignMessage>;

export function sendCampaignMessage(input: unknown) {
  const message = campaignMessage.parse(input);
  const content = message.kind === "receipt"
    ? `Thank you ${message.donor}. Your receipt is $${(message.amountCents / 100).toFixed(2)}.`
    : message.kind === "reminder"
      ? `Hi ${message.volunteer}, your volunteer shift is ${message.shift}.`
      : `${message.campaign} has raised $${(message.totalCents / 100).toFixed(2)}.`;
  return infrai.email.send({ to: message.to, subject: message.kind, html: `<p>${content}</p>` });
}
