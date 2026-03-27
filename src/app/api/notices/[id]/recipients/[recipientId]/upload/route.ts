import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, recipientId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeRecipient.findFirst({
    where: { id: recipientId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const type = formData.get("type") as string;
    const file = formData.get("file") as File;

    if (!type || !["ad_card", "receipt"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'ad_card' or 'receipt'" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", "notices", id);
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".png";
    const filename = `${recipientId}_${type}${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const relativePath = `data/uploads/notices/${id}/${filename}`;

    const updateData = type === "ad_card"
      ? { adCardUrl: relativePath }
      : { receiptUrl: relativePath };

    const updated = await prisma.noticeRecipient.update({
      where: { id: recipientId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "UPLOAD",
        entity: "NoticeRecipient",
        entityId: recipientId,
        details: `Uploaded ${type} for recipient: ${existing.recipientName}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error uploading file:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
