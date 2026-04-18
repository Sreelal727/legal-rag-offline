import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { BANKING_TEMPLATES } from "@/lib/banking-templates";

/**
 * Generate a document within a banking matter pipeline.
 * Fills {{variables}} from extractedData + case data.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id } = await ctx.params;
  const orgId = getOrgId(session!);

  const matter = await prisma.bankingMatter.findFirst({
    where: { id, organizationId: orgId },
    include: {
      case: {
        include: {
          caseClients: { include: { client: true } },
          oppositeParties: true,
          revivalLetters: { orderBy: { revivalDate: "desc" }, take: 1 },
          accountStatements: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  const body = await req.json();
  const { documentType, variables: userVars = {} } = body;

  if (!documentType) {
    return NextResponse.json({ error: "documentType is required" }, { status: 400 });
  }

  // Find template
  const template = BANKING_TEMPLATES.find((t) => t.documentType === documentType);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${documentType}` }, { status: 400 });
  }

  // Build auto-fill variables from extractedData + case + user overrides
  const extracted = matter.extractedData ? JSON.parse(matter.extractedData) : {};
  const caseData = matter.case;
  const autoVars: Record<string, string> = {};

  // From extracted data card
  if (extracted) {
    autoVars.bankName = extracted.bankName || "";
    autoVars.branchName = extracted.branchName || "";
    autoVars.bankAddress = extracted.bankAddress || "";
    autoVars.bankCorpDescription = extracted.bankCorpDescription || "";
    autoVars.bankPAN = extracted.bankPAN || "";
    autoVars.bankEmail = extracted.bankEmail || "";
    autoVars.bankPhone = extracted.bankPhone || "";
    autoVars.authorizedOfficerName = extracted.authorizedOfficerName || "";
    autoVars.authorizedOfficerDesignation = extracted.authorizedOfficerDesignation || "Manager";
    autoVars.borrowerName = extracted.borrowerName || "";
    autoVars.borrowerAddress = extracted.borrowerAddress || "";
    autoVars.loanType = extracted.loanType || "";
    autoVars.loanAccountNumber = extracted.loanAccountNumber || "";
    autoVars.loanAmount = extracted.loanAmount || "";
    autoVars.outstandingAmount = extracted.outstandingAmount || "";
    autoVars.interestRate = extracted.interestRate || "";
    autoVars.penalRate = extracted.penalRate || "";
    autoVars.interestRests = extracted.interestRests || "monthly";
    autoVars.demandNoticeDate = extracted.demandNoticeDate || "";
    autoVars.demandNoticeMode = extracted.demandNoticeMode || "Registered Post with Acknowledgment Due";
    autoVars.securityBlock = extracted.securityDescription || "";
    autoVars.loanFacilitiesBlock = extracted.loanFacilitiesNarrative || "";
    autoVars.documentsExecutedBlock = extracted.documentsExecutedNarrative || "";
    autoVars.acknowledgementsBlock = extracted.acknowledgementsNarrative || "";
    autoVars.defaultDescription = extracted.defaultNarrative || "";
    autoVars.causeOfActionDates = extracted.causeOfActionDates || "";
    autoVars.causeOfActionPlace = extracted.causeOfActionPlace || "";
    autoVars.natureOfDispute = extracted.natureOfDispute || "Recovery of loan amount";
    autoVars.briefSynopsis = extracted.briefSynopsis || "";
  }

  // From case data
  if (caseData) {
    autoVars.caseNumber = caseData.caseNumber || "";
    autoVars.courtName = matter.courtName || caseData.courtName || "";

    // Plaintiff = first client (the bank)
    const firstClient = caseData.caseClients?.[0]?.client;
    if (firstClient) {
      autoVars.plaintiffName = firstClient.name || "";
      autoVars.clientName = firstClient.name || "";
      autoVars.clientAddress = firstClient.address || "";
    }

    // Defendants = opposite parties
    if (caseData.oppositeParties?.length) {
      autoVars.defendantBlock = caseData.oppositeParties
        .map((op: any, i: number) => {
          const prefix = caseData.oppositeParties!.length > 1 ? `${i + 1}. ` : "";
          const desig = op.designation ? `${op.designation} ${op.fatherHusbandName || ""}` : "";
          return `${prefix}${op.name},${desig ? `\n${desig},` : ""}\n${op.address || ""}${op.phone ? `\nMobile: ${op.phone}` : ""}                                    ...  Defendant${caseData.oppositeParties!.length > 1 ? ` No.${i + 1}` : ""}`;
        })
        .join("\n\n");
      autoVars.defendantName = caseData.oppositeParties[0].name;
      autoVars.defendantAddress = caseData.oppositeParties[0].address || "";
      autoVars.defendantPhone = caseData.oppositeParties[0].phone || "";
      autoVars.judgmentDebtorBlock = autoVars.defendantBlock.replace(/Defendant/g, "Respondent / Judgment Debtor");
      autoVars.judgmentDebtorNames = caseData.oppositeParties.map((op: any) => op.name).join(", ");
    }

    // Build loan facilities narrative for mediation application
    if (extracted.loanFacilities?.length) {
      autoVars.loanFacilitiesBlock = extracted.loanFacilities
        .map((f: any, i: number) => {
          return `${i + 1}. ${f.description || f.type} of Rs.${Number(f.amount || 0).toLocaleString("en-IN")}/- (A/c No. ${f.accountNumber || ""}) sanctioned on ${f.sanctionDate || ""} with interest at ${f.interestRate || ""}% p.a.`;
        })
        .join("\n\n");
    }

    // Build documents executed narrative for mediation application
    if (extracted.documentsExecuted?.length) {
      autoVars.documentsExecutedBlock = "The Opposite Party has executed and delivered the following documents:\n\n" +
        extracted.documentsExecuted
          .map((d: any, i: number) => `(${String.fromCharCode(97 + i)}) ${typeof d === "string" ? d : d.description || JSON.stringify(d)}`)
          .join("\n\n");
    }

    // Latest SOA total → outstandingAmount
    if (caseData.accountStatements?.[0]) {
      const soa = caseData.accountStatements[0];
      autoVars.outstandingAmount = autoVars.outstandingAmount || soa.totalDue?.toString() || "";
      autoVars.outstandingDate = soa.toDate?.toString().slice(0, 10) || "";
    }

    // Latest revival → limitation
    if (caseData.revivalLetters?.[0]) {
      const rev = caseData.revivalLetters[0];
      autoVars.revivalDate = rev.revivalDate?.toString().slice(0, 10) || "";
      autoVars.newLimitationDate = rev.newLimitationDate?.toString().slice(0, 10) || "";
    }
  }

  autoVars.courtName = autoVars.courtName || matter.courtName || "";
  autoVars.year = new Date().getFullYear().toString();
  autoVars.date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  autoVars.place = "Palakkad";
  autoVars.advocateName = "Sri G. Ananthakrishnan and Smt. K.B. Priya";
  autoVars.advocateAddress = "Gourisankar Associates, Sri Lakshmi, H.P.O. College Road, Palakkad 678 001";

  // Merge: auto-fill first, then user overrides win
  const merged = { ...autoVars, ...userVars };

  // Fill template
  let content = template.content;
  for (const [key, value] of Object.entries(merged)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    content = content.replace(regex, String(value || ""));
  }

  // Find remaining unfilled placeholders
  const remaining = (content.match(/\{\{[^}]+\}\}/g) || []).map((m: string) =>
    m.replace(/\{\{|\}\}/g, "")
  );

  // Determine sort order
  const existingDocs = await prisma.matterDocument.count({ where: { matterId: id } });

  // Save as MatterDocument
  const doc = await prisma.matterDocument.create({
    data: {
      matterId: id,
      documentType,
      title: template.name,
      content,
      templateUsed: template.name,
      sortOrder: existingDocs,
    },
  });

  return NextResponse.json({
    document: doc,
    remainingPlaceholders: remaining,
  }, { status: 201 });
}
