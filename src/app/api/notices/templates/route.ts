import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET() {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const templates = await prisma.noticeTemplate.findMany({
    where: { isActive: true, organizationId: getOrgId(session!) },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}
