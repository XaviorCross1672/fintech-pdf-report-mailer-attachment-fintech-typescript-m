import { dispatchPaymentReport } from "../src/payment_report_service";

const recipient = process.env.DEMO_EMAIL_TO;
if (!recipient) {
  throw new Error("DEMO_EMAIL_TO is required");
}

const result = await dispatchPaymentReport({
  report_id: "rep_2026_04_fintech_001",
  recipient_email: recipient,
  customer_name: "Northbank Treasury",
  period_start: "2026-04-01T00:00:00.000Z",
  period_end: "2026-04-30T23:59:59.000Z",
  events: [
    {
      id: "evt_1001",
      type: "payment_settled",
      amount_cents: 125000,
      currency: "USD",
      occurred_at: "2026-04-07T14:05:00.000Z",
      description: "merchant settlement"
    },
    {
      id: "evt_1002",
      type: "payment_failed",
      amount_cents: 4200,
      currency: "USD",
      occurred_at: "2026-04-11T09:30:00.000Z",
      description: "card retry declined"
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
