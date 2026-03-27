import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, replyId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeReply.findFirst({
    where: { id: replyId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", "notices", id, "replies");
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".pdf";
    const filename = `${replyId}_reply${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const relativePath = `data/uploads/notices/${id}/replies/${filename}`;

    const updated = await prisma.noticeReply.update({
      where: { id: replyId },
      data: {
        documentPath: relativePath,
        documentName: file.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "UPLOAD",
        entity: "NoticeReply",
        entityId: replyId,
        details: `Uploaded reply document: ${file.name}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error uploading reply document:", err);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
