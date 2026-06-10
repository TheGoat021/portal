import crypto from "crypto";

export function buildSignatureWebhookSignature(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function sendSignatureWebhook(input: {
  webhookUrl: string;
  webhookSecret?: string | null;
  payload: Record<string, unknown>;
}) {
  const rawBody = JSON.stringify(input.payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (input.webhookSecret) {
    headers["x-signature"] = buildSignatureWebhookSignature(input.webhookSecret, rawBody);
  }

  const response = await fetch(input.webhookUrl, {
    method: "POST",
    headers,
    body: rawBody,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook respondeu ${response.status}${body ? `: ${body}` : ""}`);
  }
}
