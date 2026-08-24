import { auth } from "@/lib/auth";
import PageBackdrop from "@/app/components/ui/PageBackdrop";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-8 text-slate-100">
      <PageBackdrop />

      <div className="relative mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">
            Welcome, {session.user.name ?? "User"}
          </h1>
          <p className="mt-2 text-slate-400">Authentication is working.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-500">Signals</div>
              <div className="mt-1 text-2xl font-semibold">0</div>
              <div className="mt-1 text-xs text-slate-500">
                Ready for your first analysis
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-500">News Intel</div>
              <div className="mt-1 text-2xl font-semibold">0</div>
              <div className="mt-1 text-xs text-slate-500">
                Fetch and summarize market topics
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-500">Reports</div>
              <div className="mt-1 text-2xl font-semibold">0</div>
              <div className="mt-1 text-xs text-slate-500">
                Generate sentiment snapshots
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-5">
              <h2 className="text-sm font-semibold">Next steps</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Use <span className="font-mono">/api/auth/register</span> to create users.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Explore API docs under <span className="font-mono">/docs</span>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>
                    Call intelligence endpoints to generate sentiment + market signals.
                  </span>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-5">
              <h2 className="text-sm font-semibold">UI status</h2>
              <p className="mt-3 text-sm text-slate-300">
                This dashboard is a visual shell—wire your real data later.
              </p>
              <div className="mt-4 rounded-lg bg-slate-900/60 border border-slate-800/70 p-4">
                <div className="text-xs text-slate-500">Session user</div>
                <div className="mt-1 text-sm font-semibold">
                  {session.user.email}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

