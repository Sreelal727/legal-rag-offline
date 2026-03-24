import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

export async function GET() {
  const { error, session } = await withAuth("users:read");
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { organizationId: getOrgId(session!) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      barCouncilNumber: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("users:write");
  if (error) return error;

  const orgId = getOrgId(session!);
  const body = await request.json();
  const { email, password, name, role, phone, barCouncilNumber } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  // Check org user limit
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (org) {
    const userCount = await prisma.user.count({ where: { organizationId: orgId } });
    if (userCount >= org.maxUsers) {
      return NextResponse.json({ error: `User limit reached (${org.maxUsers}). Upgrade your plan.` }, { status: 403 });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      organizationId: orgId,
      email,
      password: hashedPassword,
      name,
      role: role || "JUNIOR_ADVOCATE",
      phone,
      barCouncilNumber,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session!.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: `Created user: ${email}`,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
