import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET() {
  const { error } = await withAuth("notices:read");
  if (error) return error;

  const templates = await prisma.noticeTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}
