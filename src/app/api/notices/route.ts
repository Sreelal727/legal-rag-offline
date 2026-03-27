import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const where: any = { organizationId: getOrgId(session!) };
  if (status) where.status = status;

  const notices = await prisma.notice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { name: true, category: true } },
      case: { select: { id: true, caseNumber: true } },
      client: { select: { id: true, name: true } },
      drafter: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(notices);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const body = await request.json();
  const { templateId, caseId, clientId, title, content, noticeType } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const notice = await prisma.notice.create({
    data: {
      organizationId: getOrgId(session!),
      templateId: templateId || null,
      caseId: caseId || null,
      clientId: clientId || null,
      noticeType: noticeType || null,
      title,
      content,
      draftedBy: session!.user.id,
      status: session!.user.role === "INTERN" ? "PENDING_APPROVAL" : "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: getOrgId(session!),
      userId: session!.user.id,
      action: "CREATE",
      entity: "Notice",
      entityId: notice.id,
      details: `Drafted notice: ${title}`,
    },
  });

  return NextResponse.json(notice, { status: 201 });
}
