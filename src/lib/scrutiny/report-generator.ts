import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/llm";

export async function generateScrutinyReport(reportId: string): Promise<string> {
  const report = await prisma.scrutinyReport.findUniqueOrThrow({
    where: { id: reportId },
    include: {
      propertyDocuments: true,
      deedChainNodes: { orderBy: { chainDepth: "asc" } },
    },
  });

  // Get bank format if linked
  let formatTemplate = "";
  if (report.formatSampleId) {
    const format = await prisma.formatSample.findUnique({
      where: { id: report.formatSampleId },
    });
    if (format) {
      formatTemplate = format.textContent;
    }
  }

  // If no format linked, try semantic search by bank name
  if (!formatTemplate && report.bankName) {
    try {
      const { searchFormats } = await import("@/lib/rag/format-pipeline");
      const matches = await searchFormats(`${report.bankName} scrutiny report title search`);
      if (matches.length > 0) {
        const format = await prisma.formatSample.findUnique({
          where: { id: matches[0].formatSampleId },
        });
        if (format) formatTemplate = format.textContent;
      }
    } catch {
      // Format search not available
    }
  }

  // Build structured data for the report
  const verificationData = report.verificationData ? JSON.parse(report.verificationData) : [];
  const chainNodes = report.deedChainNodes.map((n) => ({
    documentNumber: n.documentNumber,
    registrationYear: n.registrationYear,
    sroName: n.sroName,
    registrationDate: n.registrationDate,
    deedType: n.deedType,
    grantor: n.grantor ? JSON.parse(n.grantor) : [],
    grantee: n.grantee ? JSON.parse(n.grantee) : [],
    area: n.area,
    areaOriginal: n.areaOriginal,
    consideration: n.consideration,
    isMissing: n.isMissing,
    isLatest: n.isLatest,
    surveyNumbers: n.surveyNumbers ? JSON.parse(n.surveyNumbers) : [],
  }));

  const docSummary = report.propertyDocuments.map((d) => ({
    type: d.documentType,
    fileName: d.fileName,
    language: d.language,
    verificationStatus: d.verificationStatus,
  }));

  const structuredData = JSON.stringify({
    reportTitle: report.title,
    bankName: report.bankName,
    branchName: report.branchName,
    referenceNumber: report.referenceNumber,
    borrowerName: report.borrowerName,
    propertyAddress: report.propertyAddress,
    surveyNumbers: report.surveyNumbers ? JSON.parse(report.surveyNumbers) : [],
    documents: docSummary,
    deedChain: chainNodes,
    verificationResults: verificationData,
    lawyerNotes: report.reportNotes,
  }, null, 2);

  const systemPrompt = formatTemplate
    ? `You are a legal report writer preparing a Title Scrutiny Report for a bank.

IMPORTANT: You MUST follow the exact format template provided below. Replicate its structure, headings, table layout, and style exactly. Fill in the data from the structured data provided.

--- BANK FORMAT TEMPLATE ---
${formatTemplate}
--- END FORMAT TEMPLATE ---

Fill in every field using the structured data. If data is missing, write "Not available in the bundle" or "Requires manual verification". Do NOT leave blanks or placeholders.`
    : `You are a legal report writer preparing a Title Scrutiny Report for a bank.

Generate a comprehensive scrutiny report with these sections:
1. **Report Header** - Bank name, branch, reference number, date
2. **Property Details** - Address, survey numbers, borrower details
3. **Documents Examined** - List of all documents in the bundle with types
4. **Chain of Title** - Chronological deed chain from earliest to latest, with details of each transfer
5. **Missing Documents** - List of referenced deeds not found in the bundle
6. **Area Verification** - Summary of area flow through the chain
7. **Verification Summary** - All verification check results (PASS/FAIL/WARNING)
8. **Observations & Remarks** - Key findings, issues, and recommendations
9. **Opinion** - Legal opinion on the title based on the scrutiny

Use formal legal language. Reference specific document numbers and dates. Flag all issues clearly.`;

  const content = await chatCompletion([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Generate the complete scrutiny report using this data:\n\n${structuredData}`,
    },
  ]);

  return content as string;
}
