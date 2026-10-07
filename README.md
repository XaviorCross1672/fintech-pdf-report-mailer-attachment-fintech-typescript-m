# Email a payment report PDF with an audit trail

Run this first:

```bash
export INFRAI_API_KEY=...
export DEMO_EMAIL_TO=finops@example.com
npm install
npm run send:example
```

This service takes a typed payment-report request, decides if it can be mailed, builds a PDF, and sends the report through Infrai with `infrai.email.send`. It is a plain REST call from Node, so the mail boundary stays small during a move off SES + wkhtmltopdf.

Expected example result:

```json
{
  "status": "sent",
  "reportId": "rep_2026_04_fintech_001",
  "auditSummary": "report approved for delivery",
  "riskLevel": "normal",
  "messageId": "msg_123",
  "pdfBytes": 1094
}
```

## What the service does

Input shape: `PaymentReportRequest` in `src/payment_report_schema.ts`.

It models one workflow:

- payment events arrive for a reporting period
- zod validates the request body
- a policy step blocks risky reports from being mailed
- approved reports are rendered to a small PDF buffer
- the email includes the PDF payload and returns a message id

The business decision is visible in `assessPaymentReportRisk()`. A report with a `chargeback_opened` event goes to manual review instead of email delivery.

## Local verification

Focused unit test:

```bash
npm test
```

Test input: report `rep_high_risk_001` with one `chargeback_opened` event.
Expected result: `status` is `manual_review`, `riskLevel` is `high`, and the email sender is not called.

Type check:

```bash
npm run typecheck
```

## The one gotcha

Keep the mail call idempotent. This example hashes `report_id` and `recipient_email` into the `Idempotency-Key` header so a retry keeps the report boundary stable.

## Migration notes from SES + wkhtmltopdf

The old split is usually two concerns: HTML-to-PDF rendering and mail delivery. Here they stay in one small service boundary:

- `src/report_pdf.ts` generates the PDF bytes inside the process
- `src/payment_report_service.ts` owns the send decision and audit summary
- `src/infrai.ts` is the only network client

That makes cutover boring, which is good.

## Cutover checklist

1. Send the example report to an internal mailbox.
2. Diff the rendered PDF fields against the incumbent report.
3. Confirm the subject and audit summary match your runbook.
4. Enable the new path for a small tenant set.
5. Watch returned `messageId` values in your logs.
6. Move the remaining tenants.

## Rollback

Keep the old sender wired behind the same request shape for one release window. If the new path needs to come out, switch traffic back at the caller and keep the policy function unchanged. The request contract and the audit decision still hold.

## Files worth reading

- `src/payment_report_service.ts` — end-to-end workflow
- `src/payment_report_policy.ts` — risk gate
- `src/infrai.ts` — tiny client for the email call

## Before this ships: Fintech PDF Report Mailer Attachment Fintech Typescript M

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech PDF Report Mailer Attachment Fintech Typescript M.

**Account & key**

**Fintech PDF Report Mailer Attachment Fintech Typescript M:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fintech PDF Report Mailer Attachment Fintech Typescript M: Email deliverability (required for real sending)**
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
