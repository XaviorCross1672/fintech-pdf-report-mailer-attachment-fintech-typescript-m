import { createHash } from "node:crypto";
import { infrai } from "./infrai";
import { paymentReportRequestSchema, type PaymentReportRequest } from "./payment_report_schema";
import { assessPaymentReportRisk } from "./payment_report_policy";
import { buildPaymentReportPdf } from "./report_pdf";
import { buildReportEmailHtml } from "./report_email";

export type ReportDispatchResult =
  | {
      status: "manual_review";
      reportId: string;
      auditSummary: string;
      riskLevel: "high";
    }
  | {
      status: "sent";
      reportId: string;
      auditSummary: string;
      riskLevel: "normal";
      messageId: string;
      pdfBytes: number;
    };

export type EmailSender = typeof infrai.email.send;

export async function dispatchPaymentReport(rawInput: unknown, sendEmail: EmailSender = infrai.email.send): Promise<ReportDispatchResult> {
  const input = paymentReportRequestSchema.parse(rawInput);
  return dispatchValidatedPaymentReport(input, sendEmail);
}

export async function dispatchValidatedPaymentReport(input: PaymentReportRequest, sendEmail: EmailSender = infrai.email.send): Promise<ReportDispatchResult> {
  const decision = assessPaymentReportRisk(input);

  if (!decision.shouldSend) {
    return {
      status: "manual_review",
      reportId: input.report_id,
      auditSummary: decision.auditSummary,
      riskLevel: decision.riskLevel
    };
  }

  const pdf = buildPaymentReportPdf(input, decision);
  const pdfBase64 = pdf.toString("base64");
  const html = buildReportEmailHtml(input, decision);
  const idempotencyKey = createHash("sha256").update(`payment-report:${input.report_id}:${input.recipient_email}`).digest("hex");
  const response = await sendEmail(
    {
      to: input.recipient_email,
      subject: `Payment report ${input.report_id}`,
      html,
      attachments: [{ filename: `payment-report-${input.report_id}.pdf`, content: pdfBase64, content_type: "application/pdf" }]
    },
    idempotencyKey
  );

  return {
    status: "sent",
    reportId: input.report_id,
    auditSummary: decision.auditSummary,
    riskLevel: decision.riskLevel,
    messageId: response.data.message_id,
    pdfBytes: pdf.byteLength
  };
}
