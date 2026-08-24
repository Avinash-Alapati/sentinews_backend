import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .trim()
  .min(1, "Password is required.")
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: passwordPolicySchema,
  mobileNumber: z.string().trim().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const emailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: passwordPolicySchema,
});

export const validatePasswordPolicy = (password: string) => {
  const result = passwordPolicySchema.safeParse(password);
  if (!result.success) {
    return {
      valid: false as const,
      message: result.error.issues[0]?.message ?? "Password does not meet the required policy.",
    };
  }

  return { valid: true as const };
};
