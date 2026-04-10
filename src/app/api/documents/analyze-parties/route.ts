import { NextRequest, NextResponse } from "next/server";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { analyzeDocument, extractDocText } from "@/lib/document-analyzer";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("documents:upload");
  if (error) return error;

  const contentType = request.headers.get("content-type") || "";
  let documentText = "";

  if (contentType.includes("multipart/form-data")) {
    // Handle file upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["doc", "docx", "pdf", "txt", "rtf"];
    if (!ext || !allowed.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    // Save temporarily
    const tempDir = path.join(process.cwd(), "uploads", "temp");
    await mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    try {
      documentText = await extractDocText(tempPath);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to extract text: ${err.message}` },
        { status: 400 }
      );
    }

    // Clean up temp file
    try {
      const fs = await import("fs/promises");
      await fs.unlink(tempPath);
    } catch {
      // ignore cleanup errors
    }
  } else {
    // Handle JSON body with text
    const body = await request.json();
    documentText = body.text;
  }

  if (!documentText || documentText.trim().length < 50) {
    return NextResponse.json(
      { error: "Document text is too short or empty to analyze" },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeDocument(documentText);
    return NextResponse.json({
      success: true,
      analysis,
      rawTextLength: documentText.length,
      rawTextPreview: documentText.substring(0, 500),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Analysis failed: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST to save analyzed parties to the database
 */
export async function PUT(request: NextRequest) {
  const { error, session } = await withAuth("clients:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const { plaintiff, defendants, caseId } = body;

  const results: { clients: any[]; oppositeParties: any[] } = {
    clients: [],
    oppositeParties: [],
  };

  // Create or find the client (plaintiff)
  if (plaintiff && plaintiff.name) {
    // Check if client already exists
    const existing = await prisma.client.findFirst({
      where: {
        organizationId,
        name: { contains: plaintiff.name },
      },
    });

    if (existing) {
      results.clients.push({ ...existing, _status: "existing" });
    } else {
      const clientType =
        plaintiff.type === "BANK" || plaintiff.type === "NBFC"
          ? "COMPANY"
          : plaintiff.type === "GOVERNMENT"
            ? "GOVERNMENT"
            : plaintiff.type === "COMPANY"
              ? "COMPANY"
              : "INDIVIDUAL";

      const client = await prisma.client.create({
        data: {
          name: plaintiff.name,
          clientType,
          address: plaintiff.address || null,
          companyName: plaintiff.branchName
            ? `${plaintiff.name} - ${plaintiff.branchName}`
            : null,
          notes: plaintiff.type === "BANK" || plaintiff.type === "NBFC"
            ? `Banking/Financial Institution. Branch: ${plaintiff.branchName || "N/A"}`
            : null,
          organizationId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: session!.user.id,
          action: "CREATE",
          entity: "Client",
          entityId: client.id,
          details: `Created client from document analysis: ${plaintiff.name}`,
          organizationId,
        },
      });

      results.clients.push({ ...client, _status: "created" });
    }
  }

  // Create opposite parties (defendants)
  if (defendants && defendants.length > 0 && caseId) {
    for (const def of defendants) {
      if (!def.name) continue;

      // Check if opposite party already exists for this case
      const existing = await prisma.oppositeParty.findFirst({
        where: {
          caseId,
          name: { contains: def.name },
        },
      });

      if (existing) {
        results.oppositeParties.push({ ...existing, _status: "existing" });
        continue;
      }

      const partyType = def.partyRole === "BORROWER" || def.partyRole === "CO_OBLIGANT"
        ? "DEFENDANT"
        : def.partyRole === "GUARANTOR"
          ? "DEFENDANT"
          : "RESPONDENT";

      const oppositeParty = await prisma.oppositeParty.create({
        data: {
          caseId,
          name: def.name,
          fatherHusbandName: def.fatherHusbandName || null,
          designation: def.designation || null,
          address: def.address || null,
          phone: def.phone || null,
          partyType,
          notes: [
            def.partyRole ? `Role: ${def.partyRole}` : null,
            def.age ? `Age: ${def.age}` : null,
            def.loanAccountNumber ? `Loan A/c: ${def.loanAccountNumber}` : null,
            def.aadharNumber ? `Aadhaar: ${def.aadharNumber}` : null,
          ]
            .filter(Boolean)
            .join(", "),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: session!.user.id,
          action: "CREATE",
          entity: "OppositeParty",
          entityId: oppositeParty.id,
          details: `Created opposite party from document analysis: ${def.name}`,
          organizationId,
        },
      });

      results.oppositeParties.push({ ...oppositeParty, _status: "created" });
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
}
