"use client";

import { useCallback, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/config";
import { PAYMENT_ACTIVATION_MESSAGE, PAYMENTS_ACTIVE, getBillingCycleLabel, getBillingDisplayName } from "@/lib/billing/config";
import type { CheckoutBillingCycle, PaidPlanTier } from "@/lib/plans";

type CheckoutStatus = "idle" | "waiting" | "preparing" | "checkout" | "verifying" | "verified" | "failed" | "cancelled";

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
    metadata?: {
      payment_id?: string;
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    email?: string;
    contact?: string;
  };
  config?: {
    display?: {
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  retry?: {
    enabled: boolean;
    max_count?: number;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayCheckoutResponse) => Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is available only in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded."));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

async function parseApiResponse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    setup?: boolean;
    supportMessage?: string;
    paymentId?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    const error = new Error(body.error || "Billing request failed.") as Error & {
      setup?: boolean;
      supportMessage?: string;
      paymentId?: string;
    };
    error.setup = Boolean(body.setup);
    error.supportMessage = body.supportMessage;
    error.paymentId = body.paymentId;
    throw error;
  }

  return body;
}

export function useRazorpayCheckout() {
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const startCheckout = useCallback(async (plan: PaidPlanTier, billingCycle: CheckoutBillingCycle) => {
    if (!PAYMENTS_ACTIVE) {
      setStatus("waiting");
      setMessage(PAYMENT_ACTIVATION_MESSAGE);
      setError(null);
      setPaymentId(null);
      return;
    }

    setStatus("preparing");
    setMessage("Preparing secure checkout...");
    setError(null);
    setPaymentId(null);

    try {
      const currentUser = firebaseAuth?.currentUser;

      if (!currentUser) {
        throw new Error("Login is required before upgrading.");
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout could not be loaded.");
      }

      const token = await currentUser.getIdToken();
      const orderResponse = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan, billingCycle })
      });
      const order = (await parseApiResponse(orderResponse)) as {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        displayName: string;
        billingCycleLabel?: string;
        email?: string;
        testMode?: boolean;
      };

      setStatus("checkout");
      setMessage(
        order.testMode
          ? "Checkout is open in Razorpay test mode. UPI is shown first, but real UPI apps will not debit money with test keys."
          : "Checkout is open in Razorpay. UPI is shown first when it is enabled for the merchant account."
      );

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "FocusForge",
        description: `${order.displayName || getBillingDisplayName(plan)} ${order.billingCycleLabel ?? getBillingCycleLabel(billingCycle)}`,
        order_id: order.orderId,
        prefill: {
          email: order.email || currentUser.email || "",
          contact: currentUser.phoneNumber ?? undefined
        },
        config: {
          display: {
            sequence: ["upi", "card", "netbanking", "wallet", "paylater"],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        theme: { color: "#C9A46C" },
        modal: {
          ondismiss: () => {
            setStatus((current) => (current === "verified" || current === "verifying" ? current : "cancelled"));
            setMessage("Checkout was closed before payment finished.");
          }
        },
        handler: async (response) => {
          setStatus("verifying");
          setMessage("Verifying payment securely...");
          setPaymentId(response.razorpay_payment_id);

          const verifyResponse = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(response)
          });
          await parseApiResponse(verifyResponse);
          setStatus("verified");
          setMessage("Payment verified. Your plan is active.");
        }
      });

      checkout.on("payment.failed", (response) => {
        const nextPaymentId = response.error?.metadata?.payment_id ?? null;
        const upiHint = order.testMode
          ? "This checkout is using Razorpay test keys, so real UPI apps cannot complete a live debit."
          : "If this was a UPI attempt, confirm UPI is enabled for the live Razorpay account and the customer is using a supported UPI app/intent flow.";
        setPaymentId(nextPaymentId);
        setStatus("failed");
        setError(
          `${response.error?.description || "Payment failed."} ${upiHint} ${
            nextPaymentId
              ? `If money was deducted but your plan did not activate, please contact support with your payment ID: ${nextPaymentId}.`
              : "If money was deducted but your plan did not activate, please contact support with your payment ID."
          }`
        );
      });
      checkout.open();
    } catch (currentError) {
      const typedError = currentError as Error & { supportMessage?: string; paymentId?: string };
      setStatus("failed");
      setPaymentId(typedError.paymentId ?? null);
      setError(
        `${typedError.message} ${
          typedError.supportMessage
            ? typedError.paymentId
              ? `${typedError.supportMessage} ${typedError.paymentId}`
              : typedError.supportMessage
            : ""
        }`.trim()
      );
      setMessage(null);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage(null);
    setError(null);
    setPaymentId(null);
  }, []);

  return {
    status,
    message,
    error,
    paymentId,
    busy: status === "preparing" || status === "checkout" || status === "verifying",
    startCheckout,
    reset
  };
}
