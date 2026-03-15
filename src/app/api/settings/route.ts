import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET() {
  const { error } = await withAuth("settings:read");
  if (error) return error;

  let settings = await prisma.firmSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.firmSettings.create({ data: { id: "default" } });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const { error, session } = await withAuth("settings:write");
  if (error) return error;

  const body = await request.json();

  const settings = await prisma.firmSettings.update({
    where: { id: "default" },
    data: body,
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      entity: "FirmSettings",
      entityId: "default",
    },
  });

  return NextResponse.json(settings);
}
