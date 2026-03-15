import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get("caseId") || undefined;

  const where: any = {};
  if (caseId) where.caseId = caseId;

  const submissions = await prisma.documentSubmission.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, role: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const { title, description, documentType, caseId, clientId, priority, dueDate, assignedTo, courtName } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const submission = await prisma.documentSubmission.create({
    data: {
      title,
      description: description || null,
      documentType: documentType || "PLEADING",
      status: "TODO",
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      caseId: caseId || null,
      clientId: clientId || null,
      assignedTo: assignedTo || null,
      courtName: courtName || null,
      createdBy: session!.user.id,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, role: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(submission, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { error } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const { id, status, sortOrder, ...rest } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const data: any = {};
  if (status !== undefined) data.status = status;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (rest.title !== undefined) data.title = rest.title;
  if (rest.description !== undefined) data.description = rest.description;
  if (rest.priority !== undefined) data.priority = rest.priority;
  if (rest.assignedTo !== undefined) data.assignedTo = rest.assignedTo || null;
  if (rest.dueDate !== undefined) data.dueDate = rest.dueDate ? new Date(rest.dueDate) : null;
  if (rest.remarks !== undefined) data.remarks = rest.remarks;

  const updated = await prisma.documentSubmission.update({
    where: { id },
    data,
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, role: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { error } = await withAuth("cases:write");
  if (error) return error;

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.documentSubmission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
