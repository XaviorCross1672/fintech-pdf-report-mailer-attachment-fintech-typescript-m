import { z } from "zod";

const paymentEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["payment_settled", "payment_failed", "chargeback_opened"]),
  amount_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  occurred_at: z.string().datetime(),
  description: z.string().min(1)
});

export const paymentReportRequestSchema = z.object({
  report_id: z.string().min(1),
  recipient_email: z.string().email(),
  customer_name: z.string().min(1),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  events: z.array(paymentEventSchema).min(1)
});

export type PaymentReportRequest = z.infer<typeof paymentReportRequestSchema>;
export type PaymentEvent = z.infer<typeof paymentEventSchema>;
