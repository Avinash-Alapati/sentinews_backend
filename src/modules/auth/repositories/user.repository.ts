import { prisma } from "@/shared/lib/prisma";

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
      googleId: true,
      provider: true,
      image: true,
      emailVerified: true,
      mobileNumber: true,
      mobileVerified: true,
      mobileOtpHash: true,
      mobileOtpExpiresAt: true,
      mobileOtpAttempts: true,
      mobileOtpResendCount: true,
    },
  });
};

export const findUserByGoogleId = async (googleId: string) => {
  return prisma.user.findUnique({
    where: { googleId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      provider: true,
      image: true,
    },
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      provider: true,
      googleId: true,
    },
  });
};

export const createUser = async ({
  name,
  email,
  passwordHash,
  googleId,
  provider,
  image,
  emailVerified,
  mobileNumber,
  mobileVerified,
}: {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  provider?: string;
  image?: string;
  emailVerified?: Date | null;
  mobileNumber?: string | null;
  mobileVerified?: boolean;
}) => {
  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      googleId,
      provider,
      image,
      emailVerified,
      mobileNumber,
      mobileVerified,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      provider: true,
      googleId: true,
      image: true,
    },
  });
};

export const updateUserGoogleFields = async ({
  id,
  googleId,
  provider,
  image,
}: {
  id: string;
  googleId: string;
  provider: string;
  image?: string;
}) => {
  return prisma.user.update({
    where: { id },
    data: {
      googleId,
      provider,
      image,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      provider: true,
      googleId: true,
      image: true,
    },
  });
};

