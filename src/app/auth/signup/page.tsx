"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import GlassCard from "@/app/components/ui/GlassCard";
import PageBackdrop from "@/app/components/ui/PageBackdrop";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import TextField from "@/app/components/ui/TextField";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordHint, setPasswordHint] = useState("Use at least 8 characters, one uppercase, one lowercase, one number, and one special character.");

  const [mobileNumber, setMobileNumber] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, mobileNumber }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          data.message || data.error || "Unable to create account."
        );
        return;
      }

      router.push("/auth/signin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <PageBackdrop />

      <GlassCard title="Create account" subtitle="Register for SentiNews">
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            type="tel"
            placeholder="Mobile number (with country code)"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            required
          />
          <TextField
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordHint("Use at least 8 characters, one uppercase, one lowercase, one number, and one special character.");
            }}
            required
          />

          <p className="text-xs leading-5 text-slate-400">{passwordHint}</p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </PrimaryButton>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Already have an account? <a className="text-sky-400 hover:underline" href="/auth/signin">Sign in</a>.
        </p>
      </GlassCard>
    </main>
  );
}

