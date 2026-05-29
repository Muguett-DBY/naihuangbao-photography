export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";

export type PaymentIntentStatus = "requires_payment_method" | "requires_confirmation" | "succeeded" | "failed" | "cancelled";

export type PaymentProvider = "stripe" | "cloudflare" | "placeholder";

export type PaymentPurpose = "booking_deposit" | "course_purchase" | "workshop_registration" | "preset_purchase" | "merchandise_purchase";

export type CreatePaymentIntentRequest = {
  purpose: PaymentPurpose;
  amountCents: number;
  currency: string;
  referenceId: string;
  metadata?: Record<string, string>;
};

export type CreatePaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
};

export type ConfirmPaymentRequest = {
  paymentIntentId: string;
};

export type ConfirmPaymentResponse = {
  status: PaymentIntentStatus;
  paymentIntentId: string;
};

export type PaymentRecord = {
  id: string;
  payment_intent_id: string;
  purpose: PaymentPurpose;
  reference_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  metadata?: string;
  created_at: string;
  updated_at: string;
};

export type WebhookEvent = {
  type: string;
  data: {
    object: {
      id: string;
      status: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };
  };
};

export type PaymentFormProps = {
  purpose: PaymentPurpose;
  amountCents: number;
  currency?: string;
  referenceId: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
};
