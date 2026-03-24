import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("documents:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get("caseId");
  const search = searchParams.get("search") || "";

  const where: any = {
    organizationId: getOrgId(session!),
  };
  if (caseId) where.caseId = caseId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { fileName: { contains: search } },
    ];
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      _count: { select: { chunks: true } },
    },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("documents:upload");
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const caseId = formData.get("caseId") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "File and title are required" }, { status: 400 });
  }

  // Save file
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await prisma.document.create({
    data: {
      title,
      fileName: file.name,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: session!.user.id,
      caseId: caseId || null,
      organizationId: getOrgId(session!),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPLOAD",
      entity: "Document",
      entityId: document.id,
      details: `Uploaded: ${file.name}`,
      organizationId: getOrgId(session!),
    },
  });

  return NextResponse.json(document, { status: 201 });
}
