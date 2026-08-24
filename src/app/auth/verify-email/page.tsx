"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import GlassCard from "@/app/components/ui/GlassCard";
import PageBackdrop from "@/app/components/ui/PageBackdrop";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    const verify = async () => {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus("success");
        setMessage(data.message ?? "Email verified successfully.");
        return;
      }

      setStatus("error");
      setMessage(data.message ?? "Verification failed.");
    };

    void verify();
  }, [searchParams]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <PageBackdrop />
      <GlassCard title="Email verification" subtitle="Secure your account">
        <div className="mt-4 text-sm leading-6 text-slate-300">
          <p>{message}</p>
          <div className="mt-6">
            <Link href="/auth/signin" className="text-sky-400 hover:underline">
              Continue to sign in
            </Link>
          </div>
        </div>
      </GlassCard>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-100" />}> 
      <VerifyEmailContent />
    </Suspense>
  );
}
