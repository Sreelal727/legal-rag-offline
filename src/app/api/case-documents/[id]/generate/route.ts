import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  if (!body.templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  // Verify document belongs to org
  const document = await prisma.caseDocument.findFirst({
    where: { id, organizationId },
    include: {
      case: {
        include: {
          caseClients: { include: { client: true } },
          oppositeParties: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Get template
  const template = await prisma.caseTemplate.findFirst({
    where: { id: body.templateId, organizationId },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Build variables: start with auto-filled from case data, then overlay user-provided
  const autoVars: Record<string, string> = {};
  const caseData = document.case;

  if (caseData) {
    autoVars.caseNumber = caseData.caseNumber || "";
    autoVars.courtName = caseData.courtName || "";
    autoVars.caseType = caseData.caseType || "";
    autoVars.year = new Date().getFullYear().toString();
    autoVars.suitValue = caseData.suitValue ? caseData.suitValue.toString() : "";
    autoVars.courtFee = caseData.courtFee ? caseData.courtFee.toString() : "";

    // First client as plaintiff/petitioner/complainant/caveator
    const firstClient = caseData.caseClients?.[0]?.client;
    if (firstClient) {
      autoVars.plaintiffName = firstClient.name || "";
      autoVars.petitionerName = firstClient.name || "";
      autoVars.complainantName = firstClient.name || "";
      autoVars.caveatorName = firstClient.name || "";
      autoVars.deponentName = firstClient.name || "";
      autoVars.partyName = firstClient.name || "";
      autoVars.plaintiffAddress = firstClient.address || "";
      autoVars.petitionerAddress = firstClient.address || "";
      autoVars.complainantAddress = firstClient.address || "";
      autoVars.caveatorAddress = firstClient.address || "";
      autoVars.deponentAddress = firstClient.address || "";
      autoVars.plaintiffDesignation = firstClient.designation || "S/o";
      autoVars.petitionerDesignation = firstClient.designation || "S/o";
      autoVars.complainantDesignation = firstClient.designation || "S/o";
      autoVars.caveatorDesignation = firstClient.designation || "S/o";
      autoVars.deponentDesignation = firstClient.designation || "S/o";
      autoVars.plaintiffFatherName = firstClient.fatherHusbandName || "";
      autoVars.petitionerFatherName = firstClient.fatherHusbandName || "";
      autoVars.complainantFatherName = firstClient.fatherHusbandName || "";
      autoVars.caveatorFatherName = firstClient.fatherHusbandName || "";
      autoVars.deponentFatherName = firstClient.fatherHusbandName || "";
      autoVars.plaintiffAge = firstClient.age ? firstClient.age.toString() : "";
      autoVars.deponentAge = firstClient.age ? firstClient.age.toString() : "";
      autoVars.plaintiffOccupation = firstClient.occupation || "";
    }

    // First opposite party as defendant/respondent/accused
    const firstOP = caseData.oppositeParties?.[0];
    if (firstOP) {
      autoVars.defendantName = firstOP.name || "";
      autoVars.respondentName = firstOP.name || "";
      autoVars.accusedName = firstOP.name || "";
      autoVars.oppositePartyName = firstOP.name || "";
      autoVars.potentialPetitionerName = firstOP.name || "";
      autoVars.defendantAddress = firstOP.address || "";
      autoVars.respondentAddress = firstOP.address || "";
      autoVars.accusedAddress = firstOP.address || "";
      autoVars.defendantDesignation = firstOP.designation || "S/o";
      autoVars.respondentDesignation = firstOP.designation || "S/o";
      autoVars.accusedDesignation = firstOP.designation || "S/o";
      autoVars.defendantFatherName = firstOP.fatherHusbandName || "";
      autoVars.respondentFatherName = firstOP.fatherHusbandName || "";
      autoVars.accusedFatherName = firstOP.fatherHusbandName || "";
    }
  }

  // Auto-fill date and year
  autoVars.date = autoVars.date || new Date().toLocaleDateString("en-IN");
  autoVars.year = autoVars.year || new Date().getFullYear().toString();

  // Merge user-provided variables (they take priority)
  const variables: Record<string, string> = { ...autoVars, ...(body.variables || {}) };

  // Replace {{variable}} placeholders in template content
  let content = template.content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    content = content.replace(regex, value);
  }

  // Update the document with generated content and link to template
  const updated = await prisma.caseDocument.update({
    where: { id },
    data: {
      content,
      templateId: template.id,
      documentType: template.documentType,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      template: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    document: updated,
    autoFilledVariables: Object.keys(autoVars),
    remainingPlaceholders: (content.match(/\{\{[^}]+\}\}/g) || []).map((m: string) => m.replace(/\{\{|\}\}/g, "")),
  });
}
