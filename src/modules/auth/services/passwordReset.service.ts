import bcrypt from "bcrypt";
import { prisma } from "@/shared/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import { findUserByEmail } from "../repositories/user.repository";
import { generateResetToken, hashToken } from "@/lib/token";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export const validatePassword = (password: string) => {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include an uppercase letter." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include a lowercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must include a number." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must include a special character." };
  }

  return { valid: true };
};

export const createPasswordResetToken = async (email: string, baseUrl: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  // Always return a generic response — do not leak existence
  if (!user) {
    return { created: false };
  }

  // Remove any previous tokens for the user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const { token, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
  await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });

  return { created: true };
};

export const verifyPasswordResetToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  return record;
};

export const resetPassword = async (token: string, password: string) => {
  const record = await verifyPasswordResetToken(token);
  if (!record) return null;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });

  // Invalidate token (single-use)
  await prisma.passwordResetToken.delete({ where: { id: record.id } });

  return true;
};
