"use client";

import { FormEvent, useState } from "react";
import GlassCard from "@/app/components/ui/GlassCard";
import PageBackdrop from "@/app/components/ui/PageBackdrop";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import TextField from "@/app/components/ui/TextField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Unable to request reset link.");
        return;
      }

      setMessage(data.message || "If an account exists with that email, a reset link has been sent to your email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <PageBackdrop />
      <GlassCard title="Forgot password" subtitle="Reset your SentiNews password">
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-green-400">{message}</p> : null}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send reset link"}
          </PrimaryButton>
        </form>
      </GlassCard>
    </main>
  );
}
