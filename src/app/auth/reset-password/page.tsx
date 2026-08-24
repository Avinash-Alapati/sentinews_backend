"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import GlassCard from "@/app/components/ui/GlassCard";
import PageBackdrop from "@/app/components/ui/PageBackdrop";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import TextField from "@/app/components/ui/TextField";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  const schema = z
    .object({
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must include an uppercase letter")
        .regex(/[a-z]/, "Password must include a lowercase letter")
        .regex(/[0-9]/, "Password must include a number")
        .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords must match",
    });

  useEffect(() => {
    if (!token) {
      setError("Reset token is missing.");
      setValidToken(false);
      return;
    }

    const validateToken = async () => {
      setError("");
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.message || "Reset token is invalid or expired.");
          setValidToken(false);
          return;
        }

        setValidToken(true);
      } catch {
        setError("Unable to verify reset token.");
        setValidToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validToken) {
      setError("Cannot reset password because the reset token is invalid.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Unable to reset password.");
        return;
      }

      setMessage(data.message || "Password reset successfully.");
      setTimeout(() => router.push("/auth/signin"), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <PageBackdrop />
      <GlassCard title="Reset password" subtitle="Choose a new password for SentiNews">
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={validToken === false}
          />
          <TextField
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={validToken === false}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-green-400">{message}</p> : null}
          <PrimaryButton type="submit" disabled={!token || validToken === false || loading}>
            {loading ? "Resetting..." : "Reset password"}
          </PrimaryButton>
        </form>
      </GlassCard>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
