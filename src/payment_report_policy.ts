import type { PaymentReportRequest } from "./payment_report_schema";

export type PaymentReportDecision =
  | { shouldSend: false; riskLevel: "high"; requiresManualReview: true; auditSummary: string }
  | { shouldSend: true; riskLevel: "normal"; requiresManualReview: false; auditSummary: string };

export function assessPaymentReportRisk(input: PaymentReportRequest): PaymentReportDecision {
  const hasChargeback = input.events.some((event) => event.type === "chargeback_opened");
  const failedPayments = input.events.filter((event) => event.type === "payment_failed").length;

  if (hasChargeback || failedPayments >= 3) {
    return {
      shouldSend: false,
      riskLevel: "high",
      requiresManualReview: true,
      auditSummary: hasChargeback
        ? "manual review required: chargeback opened in reporting period"
        : "manual review required: repeated payment failures in reporting period"
    };
  }

  return {
    shouldSend: true,
    riskLevel: "normal",
    requiresManualReview: false,
    auditSummary: "report approved for delivery"
  };
}
