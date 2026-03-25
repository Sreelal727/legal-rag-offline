import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".tiff", ".tif"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "uploads", "scrutiny", id);
  await mkdir(uploadDir, { recursive: true });

  const existingCount = await prisma.propertyDocument.count({
    where: { scrutinyReportId: id },
  });

  const documents = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name).toLowerCase();
    const timestamp = Date.now();
    const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const isImage = IMAGE_TYPES.includes(ext);

    const doc = await prisma.propertyDocument.create({
      data: {
        scrutinyReportId: id,
        fileName: file.name,
        filePath: filePath,
        ocrRequired: isImage,
        sortOrder: existingCount + i,
      },
    });

    documents.push(doc);
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPLOAD",
      entity: "ScrutinyReport",
      entityId: id,
      details: `Uploaded ${documents.length} document(s) to scrutiny report`,
      organizationId,
    },
  });

  return NextResponse.json({ documents }, { status: 201 });
}
