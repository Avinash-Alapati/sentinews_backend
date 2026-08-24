"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DividerOr from "@/app/components/ui/DividerOr";
import GlassCard from "@/app/components/ui/GlassCard";
import PageBackdrop from "@/app/components/ui/PageBackdrop";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import SecondaryButton from "@/app/components/ui/SecondaryButton";
import TextField from "@/app/components/ui/TextField";
import {
  RATE_LIMIT_LOCKOUT_MINUTES,
  RATE_LIMIT_MESSAGE,
} from "@/shared/constants/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [countdownLabel, setCountdownLabel] = useState("");

  const isLocked = useMemo(() => {
    return lockoutUntil !== null && lockoutUntil > Date.now();
  }, [lockoutUntil]);

  useEffect(() => {
    if (!lockoutUntil) {
      setCountdownLabel("");
      return;
    }

    const updateCountdown = () => {
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs <= 0) {
        setLockoutUntil(null);
        setError("");
        setCountdownLabel("");
        return;
      }

      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      setCountdownLabel(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lockoutUntil]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLocked || isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.status === 429) {
        setLockoutUntil(Date.now() + RATE_LIMIT_LOCKOUT_MINUTES * 60 * 1000);
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError("Invalid email or password. Please verify your email before signing in.");
      }
      setIsSubmitting(false);
      return;
    }

    setLockoutUntil(null);
    setIsSubmitting(false);
    router.push("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <PageBackdrop />

      {isLocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-slate-900/95 p-6 shadow-2xl shadow-amber-400/10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Too Many Login Attempts
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              Your account has been temporarily locked.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {RATE_LIMIT_MESSAGE}
            </p>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="text-slate-400">Try again in:</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-400">{countdownLabel}</p>
            </div>
          </div>
        </div>
      ) : null}

      <GlassCard title="Sign in" subtitle="Access your SentiNews account">
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <PrimaryButton type="submit" disabled={isLocked || isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </PrimaryButton>
        </form>

        <DividerOr />

        <SecondaryButton
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          disabled={isLocked || isSubmitting}
        >
          Continue with Google
        </SecondaryButton>

        <div className="mt-4 space-y-2 text-sm text-slate-400">
          <p>
            New here? <a className="text-sky-400 hover:underline" href="/auth/signup">Create an account</a>.
          </p>
          <p>
            Forgot your password? <a className="text-sky-400 hover:underline" href="/auth/forgot-password">Reset it</a>.
          </p>
        </div>
      </GlassCard>
    </main>
  );
}

