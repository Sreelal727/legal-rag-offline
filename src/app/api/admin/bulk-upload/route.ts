import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";

const ALLOWED_EXTENSIONS = [".doc", ".docx", ".pdf", ".txt", ".rtf"];
const ALLOWED_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain",
  "application/rtf",
  "text/rtf",
];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.substring(lastDot).toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("documents:upload");
  if (error) return error;

  try {
    const organizationId = getOrgId(session!);
    const userId = session!.user.id;

    const formData = await request.formData();
    const caseId = request.nextUrl.searchParams.get("caseId") || null;

    // Validate caseId if provided
    if (caseId) {
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, organizationId },
      });
      if (!caseExists) {
        return NextResponse.json(
          { error: "Case not found or does not belong to your organization" },
          { status: 404 }
        );
      }
    }

    // Gather all file entries from the form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Attach files using form data." },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const uploaded: any[] = [];
    let failed = 0;

    for (const file of files) {
      try {
        const ext = getFileExtension(file.name);

        // Validate file type
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          console.warn(`Skipping "${file.name}": unsupported extension "${ext}"`);
          failed++;
          continue;
        }

        // Generate unique filename with timestamp prefix
        const timestamp = Date.now();
        const uniqueId = uuid().slice(0, 8);
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storedName = `${timestamp}-${uniqueId}-${safeFileName}`;
        const filePath = join(uploadsDir, storedName);

        // Write file to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // Create Document record
        const document = await prisma.document.create({
          data: {
            title: file.name.replace(/\.[^/.]+$/, ""), // filename without extension as title
            fileName: file.name,
            filePath: `public/uploads/${storedName}`,
            fileType: file.type || ext.replace(".", ""),
            fileSize: file.size,
            uploadedBy: userId,
            caseId,
            organizationId,
          },
        });

        uploaded.push({
          id: document.id,
          title: document.title,
          fileName: document.fileName,
          filePath: document.filePath,
          fileType: document.fileType,
          fileSize: document.fileSize,
        });
      } catch (fileErr: any) {
        console.error(`Failed to upload "${file.name}":`, fileErr.message);
        failed++;
      }
    }

    // Audit log for bulk upload
    if (uploaded.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BULK_UPLOAD",
          entity: "Document",
          details: `Bulk uploaded ${uploaded.length} documents${caseId ? ` to case ${caseId}` : ""}. ${failed} failed.`,
          organizationId,
        },
      });
    }

    return NextResponse.json({
      uploaded: uploaded.length,
      failed,
      documents: uploaded,
    });
  } catch (err: any) {
    console.error("Bulk upload error:", err);
    return NextResponse.json(
      { error: err.message || "Bulk upload failed" },
      { status: 500 }
    );
  }
}
