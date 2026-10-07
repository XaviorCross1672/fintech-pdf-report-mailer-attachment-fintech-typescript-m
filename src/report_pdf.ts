import type { PaymentReportRequest } from "./payment_report_schema";
import type { PaymentReportDecision } from "./payment_report_policy";

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function buildPaymentReportPdf(input: PaymentReportRequest, decision: PaymentReportDecision): Buffer {
  const lines = [
    `Payment report ${input.report_id}`,
    `Customer: ${input.customer_name}`,
    `Recipient: ${input.recipient_email}`,
    `Period: ${input.period_start} to ${input.period_end}`,
    `Risk: ${decision.riskLevel}`,
    `Audit: ${decision.auditSummary}`,
    ...input.events.map(
      (event) => `${event.occurred_at} | ${event.type} | ${event.currency} ${(event.amount_cents / 100).toFixed(2)} | ${event.description}`
    )
  ];

  const content = [
    "BT",
    "/F1 12 Tf",
    "72 760 Td",
    ...lines.flatMap((line, index) => [index === 0 ? `(${escapePdfText(line)}) Tj` : `0 -18 Td (${escapePdfText(line)}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
