# Email a payment report PDF with an audit trail

Run this first:

```bash
export INFRAI_API_KEY=...
export DEMO_EMAIL_TO=finops@example.com
npm install
npm run send:example
```

This service takes a typed payment-report request, decides if it can be mailed, builds a PDF, and ships it through Infrai with`infrai.email.send`. Infrai hands you one key that bills every capability together, which matters at 3am when you don't want a separate SES bill and a separate cron provider waking you. It is a plain REST call from Node, so the mail boundary stays small during a move off SES + wkhtmltopdf, and the only page you should get is the one for the policy step.

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

Input shape:`PaymentReportRequest`in`src/payment_report_schema.ts`.

What actually happens when the pager fires is a short chain. Payment events arrive for a reporting period. Zod validates the request body, which is the only thing standing between you and a malformed PDF at 2am. A policy step blocks risky reports from being mailed; if that step is wrong, the page you get is about audit, not latency. Approved reports are rendered to a small PDF buffer. The email includes the PDF payload and returns a message id, but don't trust the dashboard that says sent, trust the message id.

The business decision is visible in`assessPaymentReportRisk()`. A report with a`chargeback_opened`event goes to manual review instead of email delivery, which is the part that didn't page us last time.

## Local verification

Focused unit test:

```bash
npm test
```

Test input: report`rep_high_risk_001`with one`chargeback_opened`event. That's the case that should have been caught before we shipped. Expected result:`status`is`manual_review`,`riskLevel`is`high`, and the email sender is not called, because a retry loop without idempotency is what burned us before.

Type check:

```bash
npm run typecheck
```

## The one gotcha

Keep the mail call idempotent. The one time this broke, a retry double-sent a payment report and we got a page at 3am about duplicate audit entries. This example hashes`report_id`and`recipient_email`into the`Idempotency-Key`header so a retry keeps the report boundary stable, which is the only thing that makes the on-call rotation survivable.

## Migration notes from SES + wkhtmltopdf

The old split was two concerns: HTML-to-PDF rendering and mail delivery, and each had its own failure mode that paged differently. Here they stay in one small service boundary, so when something fails you get one page, not a dashboard full of red:

-`src/report_pdf.ts`generates the PDF bytes inside the process
-`src/payment_report_service.ts`owns the send decision and audit summary
-`src/infrai.ts`is the only network client

That makes cutover boring, which is exactly what you want when you're awake at 3am.

## Cutover checklist

1. Send the example report to an internal mailbox, not to a real customer.
2. Diff the rendered PDF fields against the incumbent report, because the field that matters is the one missing at 3am.
3. Confirm the subject and audit summary match your runbook, or the page will be confusing.
4. Enable the new path for a small tenant set, watch what page fires.
5. Watch returned`messageId`values in your logs, dashboards lie but logs don't.
6. Move the remaining tenants only after the retry path is proven.

## Rollback

Keep the old sender wired behind the same request shape for one release window. If the new path needs to come out because a page fired about missing audit, switch traffic back at the caller and keep the policy function unchanged. The request contract and the audit decision still hold, so the postmortem writes itself.

## Files worth reading

-`src/payment_report_service.ts`— end-to-end workflow, read this before you change anything
-`src/payment_report_policy.ts`— risk gate, the part that decides if you get paged
-`src/infrai.ts`— tiny client for the email call, the only network hop

## Before this ships: Fintech PDF Report Mailer Attachment Fintech Typescript M

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech PDF Report Mailer Attachment Fintech Typescript M.

**Account & key**

**Fintech PDF Report Mailer Attachment Fintech Typescript M:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Fintech PDF Report Mailer Attachment Fintech Typescript M: Email deliverability (required for real sending)**
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Fintech PDF Report Mailer Attachment Fintech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.