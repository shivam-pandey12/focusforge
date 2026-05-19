import crypto from "crypto";

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  checkoutConfigId?: string;
}

export class RazorpaySetupError extends Error {
  code = "razorpay_setup_missing";

  constructor(message: string) {
    super(message);
    this.name = "RazorpaySetupError";
  }
}

export function getRazorpaySetupError(requireWebhookSecret = false): string | null {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.";
  }

  if (requireWebhookSecret && !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return "Razorpay webhook secret is not configured. Add RAZORPAY_WEBHOOK_SECRET.";
  }

  return null;
}

export function getPublicRazorpayKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

export function getRazorpayCheckoutConfigId(): string {
  return process.env.RAZORPAY_CHECKOUT_CONFIG_ID?.trim() || "";
}

export function isRazorpayTestMode(keyId = getPublicRazorpayKey()): boolean {
  return keyId.startsWith("rzp_test_");
}

function requireRazorpaySecret(requireWebhookSecret = false): void {
  const setupError = getRazorpaySetupError(requireWebhookSecret);

  if (setupError) {
    throw new RazorpaySetupError(setupError);
  }
}

function timingSafeEqualText(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function createRazorpayOrder(input: RazorpayOrderInput): Promise<RazorpayOrderResponse> {
  requireRazorpaySecret();

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      ...(input.checkoutConfigId ? { checkout_config_id: input.checkoutConfigId } : {})
    })
  });

  const body = (await response.json().catch(() => ({}))) as Partial<RazorpayOrderResponse> & {
    error?: { description?: string };
  };

  if (!response.ok || !body.id) {
    throw new Error(body.error?.description || "Could not create Razorpay order.");
  }

  return {
    id: body.id,
    amount: Number(body.amount ?? input.amount),
    currency: String(body.currency ?? input.currency),
    status: String(body.status ?? "created")
  };
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  requireRazorpaySecret();

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return timingSafeEqualText(expected, signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  requireRazorpaySecret(true);

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqualText(expected, signature);
}
