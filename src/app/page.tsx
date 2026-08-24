import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 selection:bg-emerald-500 selection:text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.08),transparent_40%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl text-center space-y-8 border border-slate-800 bg-slate-900/50 backdrop-blur-md p-10 rounded-2xl shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Backend API Engine V1
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
            SentiNews V1
          </h1>
          <p className="text-slate-400 text-base max-w-sm mx-auto">
            AI-Powered Financial Intelligence Platform. Foundation initialized successfully.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link href="/auth/signup" className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950">
            Create account
          </Link>
          <Link href="/auth/signin" className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
