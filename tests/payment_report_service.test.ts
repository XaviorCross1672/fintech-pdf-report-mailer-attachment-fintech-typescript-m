import test from "node:test";
import assert from "node:assert/strict";
import { dispatchPaymentReport } from "../src/payment_report_service";

test("high-risk reports stay in manual review and do not send email", async () => {
  let sendCalled = false;

  const result = await dispatchPaymentReport(
    {
      report_id: "rep_high_risk_001",
      recipient_email: "ops@example.com",
      customer_name: "Ledger Capital",
      period_start: "2026-05-01T00:00:00.000Z",
      period_end: "2026-05-31T23:59:59.000Z",
      events: [
        {
          id: "evt_1",
          type: "payment_settled",
          amount_cents: 150000,
          currency: "USD",
          occurred_at: "2026-05-02T10:00:00.000Z",
          description: "cleared transfer"
        },
        {
          id: "evt_2",
          type: "chargeback_opened",
          amount_cents: 150000,
          currency: "USD",
          occurred_at: "2026-05-03T10:00:00.000Z",
          description: "issuer dispute"
        }
      ]
    },
    async () => {
      sendCalled = true;
      return { data: { message_id: "msg_should_not_send" } };
    }
  );

  assert.equal(result.status, "manual_review");
  assert.equal(result.riskLevel, "high");
  assert.equal(result.auditSummary, "manual review required: chargeback opened in reporting period");
  assert.equal(sendCalled, false);
});

test("approved reports send a PDF attachment instead of base64 HTML", async () => {
  let checked = false;
  const result = await dispatchPaymentReport(
    {
      report_id: "rep_attachment_001",
      recipient_email: "chenhua@changba.com",
      customer_name: "Ledger Capital",
      period_start: "2026-05-01T00:00:00.000Z",
      period_end: "2026-05-31T23:59:59.000Z",
      events: [{
        id: "evt_attachment_001",
        type: "payment_settled",
        amount_cents: 100,
        currency: "USD",
        occurred_at: "2026-05-02T10:00:00.000Z",
        description: "test settlement"
      }]
    },
    async (payload) => {
      assert.equal(payload.attachments.length, 1);
      assert.equal(payload.attachments[0].content_type, "application/pdf");
      assert.match(payload.attachments[0].filename, /\.pdf$/);
      assert.match(Buffer.from(payload.attachments[0].content, "base64").toString("utf8"), /^%PDF-/);
      assert.doesNotMatch(payload.html, /PDF attachment payload|base64|<pre>/);
      checked = true;
      return { data: { message_id: "msg_attachment_test" } };
    }
  );
  assert.equal(checked, true);
  assert.equal(result.status, "sent");
});
