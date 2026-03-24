import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("documents:read");
  if (error) return error;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(document.filePath);
    const uint8 = new Uint8Array(fileBuffer);

    const contentType = document.fileType || "application/octet-stream";
    const fileName = document.fileName || path.basename(document.filePath);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(uint8.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
