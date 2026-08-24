import bcrypt from "bcrypt";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserGoogleFields,
} from "../repositories/user.repository";
import type { LoginInput, RegisterInput } from "../types";
import { validatePasswordPolicy } from "../validators/auth.validator";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "./security.service";

export const registerUser = async ({ name, email, password, mobileNumber }: RegisterInput) => {
  const normalizedEmail = email.trim().toLowerCase();

  const passwordValidation = validatePasswordPolicy(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const createdUser = await createUser({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    provider: "credentials",
    mobileNumber: mobileNumber?.trim() || null,
    mobileVerified: false,
    emailVerified: null,
  });

  const verificationToken = await createEmailVerificationToken(createdUser.id);
  await sendVerificationEmail({
    to: normalizedEmail,
    verificationUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3002"}/auth/verify-email?token=${verificationToken}`,
  });

  return createdUser;
};

export const verifyUserCredentials = async ({ email, password }: LoginInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user?.passwordHash) {
    return null;
  }

  // In production, require email verification before allowing login.
  // Skip this gate in development to allow testing without a configured SMTP server.
  if (process.env.NODE_ENV === 'production' && !user.emailVerified) {
    return { blocked: true } as const;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

export const findOrCreateGoogleUser = async ({
  googleId,
  email,
  name,
  image,
}: {
  googleId: string;
  email: string;
  name: string;
  image?: string;
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    if (!existingUser.googleId || existingUser.googleId !== googleId || existingUser.provider !== "google") {
      return updateUserGoogleFields({
        id: existingUser.id,
        googleId,
        provider: "google",
        image,
      });
    }

    return existingUser;
  }

  return createUser({
    name: name.trim(),
    email: normalizedEmail,
    googleId,
    provider: "google",
    image,
  });
};

export const getUserById = async (id: string) => {
  return findUserById(id);
};
