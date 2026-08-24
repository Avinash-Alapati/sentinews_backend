import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { RATE_LIMIT_LOCKOUT_MINUTES, RATE_LIMIT_MESSAGE } from "@/shared/constants/auth";

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_WINDOW_MS = 30 * 60 * 1000;
const RESET_WINDOW_MS = 30 * 60 * 1000;

export { RATE_LIMIT_LOCKOUT_MINUTES, RATE_LIMIT_MESSAGE };

export interface LoginRateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil: Date | null;
  shouldReset: boolean;
}

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? "";

export const normalizeLoginEmail = normalizeEmail;

export const normalizeIpAddress = (ipAddress?: string) => {
  const rawValue = ipAddress?.trim() ?? "";
  if (!rawValue) {
    return "unknown";
  }

  const candidate = rawValue.split(",")[0]?.trim() ?? "";
  if (!candidate) {
    return "unknown";
  }

  const withoutZone = candidate.split("%")?.[0] ?? "";
  const compactValue = withoutZone.replace(/^\[|\]$/g, "");

  return compactValue || "unknown";
};

const isBlockExpired = (blockedUntil?: Date | null) => {
  if (!blockedUntil) {
    return true;
  }

  return new Date(blockedUntil).getTime() <= Date.now();
};

const isResetWindowExpired = (updatedAt?: Date | null) => {
  if (!updatedAt) {
    return true;
  }

  return new Date(updatedAt).getTime() + RESET_WINDOW_MS <= Date.now();
};

const createDefaultRateLimitResult = (): LoginRateLimitResult => ({
  allowed: true,
  remainingAttempts: MAX_FAILED_ATTEMPTS,
  blockedUntil: null,
  shouldReset: false,
});

const logRateLimitAuditEvent = (event: string) => {
  console.info(`[auth-audit] ${event} timestamp=${new Date().toISOString()}`);
};

export const getLoginRateLimitKey = (email?: string, ipAddress?: string) => {
  return `${normalizeEmail(email)}::${normalizeIpAddress(ipAddress)}`;
};

export const checkLoginRateLimit = async ({
  email,
  ipAddress,
}: {
  email?: string;
  ipAddress?: string;
}): Promise<LoginRateLimitResult> => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIpAddress = normalizeIpAddress(ipAddress);

  if (!normalizedEmail) {
    return createDefaultRateLimitResult();
  }

  try {
    const { record, isBlocked, shouldReset } = await prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.loginAttempt.findUnique({
        where: {
          email_ipAddress: {
            email: normalizedEmail,
            ipAddress: normalizedIpAddress,
          },
        },
      });

      if (!existingAttempt) {
        const createdAttempt = await tx.loginAttempt.create({
          data: {
            email: normalizedEmail,
            ipAddress: normalizedIpAddress,
            attempts: 0,
            blockedUntil: null,
          },
        });

        return {
          record: createdAttempt,
          isBlocked: false,
          shouldReset: false,
        };
      }

      if (existingAttempt.blockedUntil && !isBlockExpired(existingAttempt.blockedUntil)) {
        return {
          record: existingAttempt,
          isBlocked: true,
          shouldReset: false,
        };
      }

      if (existingAttempt.attempts > 0 && (isBlockExpired(existingAttempt.blockedUntil) || isResetWindowExpired(existingAttempt.updatedAt))) {
        const resetRecord = await tx.loginAttempt.update({
          where: {
            email_ipAddress: {
              email: normalizedEmail,
              ipAddress: normalizedIpAddress,
            },
          },
          data: {
            attempts: 0,
            blockedUntil: null,
          },
        });

        return {
          record: resetRecord,
          isBlocked: false,
          shouldReset: true,
        };
      }

      return {
        record: existingAttempt,
        isBlocked: false,
        shouldReset: false,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (isBlocked) {
      logRateLimitAuditEvent("login_blocked");
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: record.blockedUntil,
        shouldReset: false,
      };
    }

    if (shouldReset) {
      logRateLimitAuditEvent("login_lockout_expired");
      return {
        allowed: true,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
        blockedUntil: null,
        shouldReset: true,
      };
    }

    return {
      allowed: true,
      remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts),
      blockedUntil: record.blockedUntil,
      shouldReset: false,
    };
  } catch (error) {
    console.error("[rate-limit] Failed to read login attempt record:", error);
    return createDefaultRateLimitResult();
  }
};

export const recordFailedLoginAttempt = async ({
  email,
  ipAddress,
}: {
  email?: string;
  ipAddress?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIpAddress = normalizeIpAddress(ipAddress);

  if (!normalizedEmail) {
    return null;
  }

  try {
    const updatedAttempt = await prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.loginAttempt.findUnique({
        where: {
          email_ipAddress: {
            email: normalizedEmail,
            ipAddress: normalizedIpAddress,
          },
        },
      });

      if (!existingAttempt || isResetWindowExpired(existingAttempt.updatedAt)) {
        return tx.loginAttempt.upsert({
          where: {
            email_ipAddress: {
              email: normalizedEmail,
              ipAddress: normalizedIpAddress,
            },
          },
          update: {
            attempts: 1,
            blockedUntil: null,
          },
          create: {
            email: normalizedEmail,
            ipAddress: normalizedIpAddress,
            attempts: 1,
            blockedUntil: null,
          },
        });
      }

      if (existingAttempt.blockedUntil && !isBlockExpired(existingAttempt.blockedUntil)) {
        return existingAttempt;
      }

      const nextAttempts = existingAttempt.attempts + 1;
      const blockedUntil = nextAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + BLOCK_WINDOW_MS)
        : null;

      const updatedRecord = await tx.loginAttempt.update({
        where: {
          email_ipAddress: {
            email: normalizedEmail,
            ipAddress: normalizedIpAddress,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
          blockedUntil,
        },
      });

      if (blockedUntil) {
        logRateLimitAuditEvent("login_failed_blocked");
      } else {
        logRateLimitAuditEvent("login_failed");
      }

      return updatedRecord;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return updatedAttempt;
  } catch (error) {
    console.error("[rate-limit] Failed to record login attempt:", error);
    return null;
  }
};

export const resetLoginAttempts = async ({
  email,
  ipAddress,
}: {
  email?: string;
  ipAddress?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIpAddress = normalizeIpAddress(ipAddress);

  if (!normalizedEmail) {
    return;
  }

  try {
    await prisma.loginAttempt.updateMany({
      where: {
        email: normalizedEmail,
        ipAddress: normalizedIpAddress,
      },
      data: {
        attempts: 0,
        blockedUntil: null,
      },
    });

    logRateLimitAuditEvent("login_success");
  } catch (error) {
    console.error("[rate-limit] Failed to reset login attempts:", error);
  }
};
