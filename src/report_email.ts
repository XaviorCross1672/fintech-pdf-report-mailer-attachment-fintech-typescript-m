import type { PaymentReportRequest } from "./payment_report_schema";
import type { PaymentReportDecision } from "./payment_report_policy";

export function buildReportEmailHtml(input: PaymentReportRequest, decision: PaymentReportDecision): string {
  return [
    `<h1>Monthly payment report</h1>`,
    `<p>Report: <strong>${input.report_id}</strong></p>`,
    `<p>Customer: ${input.customer_name}</p>`,
    `<p>Audit status: ${decision.auditSummary}</p>`
  ].join("\n");
}
