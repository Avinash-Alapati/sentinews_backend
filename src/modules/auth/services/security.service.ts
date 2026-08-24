import crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";
import { sendMail } from "@/lib/mail";
import type { User } from "@prisma/client";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const hashValue = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const createSecureToken = () => crypto.randomBytes(32).toString("hex");

const getBrowserInfo = (userAgent?: string | null) => {
  const agent = userAgent ?? "";
  const browserMatch = agent.match(/(chrome|firefox|safari|edge|opr|opera|brave)\/?\s*(\d+)?/i);
  const osMatch = agent.match(/(windows|mac os|macintosh|linux|android|iphone|ipad)/i);
  return {
    browser: browserMatch?.[1] ? browserMatch[1].charAt(0).toUpperCase() + browserMatch[1].slice(1) : "Unknown",
    operatingSystem: osMatch?.[1] ? osMatch[1].charAt(0).toUpperCase() + osMatch[1].slice(1) : "Unknown",
  };
};

export const createEmailVerificationToken = async (userId: string) => {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  const token = createSecureToken();
  const tokenHash = hashValue(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
};

export const verifyEmailToken = async (token: string) => {
  const tokenHash = hashValue(token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record) {
    return null;
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return null;
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerificationToken.delete({ where: { id: record.id } });

  return record.userId;
};

export const sendVerificationEmail = async ({ to, verificationUrl }: { to: string; verificationUrl: string }) => {
  await sendMail({
    to,
    subject: "Verify your SentiNews email",
    html: `<p>Hello,</p><p>Please verify your email address by clicking <a href="${verificationUrl}">here</a>.</p><p>If you did not create an account, you can ignore this message.</p>`,
  });
};

export const recordLoginHistory = async ({
  user,
  ipAddress,
  userAgent,
  location,
}: {
  user: Pick<User, "id">;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
}) => {
  const { browser, operatingSystem } = getBrowserInfo(userAgent);

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      browser,
      operatingSystem,
      location: location ?? null,
    },
  });
};

export const shouldSendLoginAlert = async ({
  userId,
  ipAddress,
  userAgent,
}: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  const existing = await prisma.loginHistory.findFirst({
    where: {
      userId,
      OR: [
        { ipAddress: ipAddress ?? null },
        { userAgent: userAgent ?? null },
      ],
    },
  });

  return !existing;
};

export const sendLoginAlertEmail = async ({
  to,
  ipAddress,
  browser,
  operatingSystem,
  location,
}: {
  to: string;
  ipAddress?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  location?: string | null;
}) => {
  const now = new Date();
  const details = [
    `Date: ${now.toLocaleDateString()}`,
    `Time: ${now.toLocaleTimeString()}`,
    `IP Address: ${ipAddress ?? "Unknown"}`,
    `Browser: ${browser ?? "Unknown"}`,
    `Operating System: ${operatingSystem ?? "Unknown"}`,
    `Location: ${location ?? "Unknown"}`,
  ];

  await sendMail({
    to,
    subject: "New sign-in detected for your SentiNews account",
    html: `<p>A new sign-in was detected for your account.</p><ul>${details.map((line) => `<li>${line}</li>`).join("")}</ul>`,
  });
};

