import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// POST /api/auth/password-reset — Request a password reset token
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Rate limit password reset requests by email
  const { allowed } = checkRateLimit(`pwd-reset:${email.toLowerCase()}`, RATE_LIMITS.passwordReset);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429 }
    );
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    message: "If an account exists with this email, a reset token has been generated.",
  });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive || !user.organizationId) {
    return successResponse;
  }

  // Invalidate existing tokens
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Generate token (64 hex chars)
  const token = randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // In production, send this token via email
  // For now, log it (remove in production)
  console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);

  return successResponse;
}

// PUT /api/auth/password-reset — Reset password with token
export async function PUT(request: NextRequest) {
  const { email, token, newPassword } = await request.json();

  if (!email || !token || !newPassword) {
    return NextResponse.json(
      { error: "Email, token, and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Verify token
  const isValid = await bcrypt.compare(token, resetToken.token);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Update password and clean up
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ message: "Password reset successfully" });
}
