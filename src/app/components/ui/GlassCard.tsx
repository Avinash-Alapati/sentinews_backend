import type { ReactNode } from "react";

export default function GlassCard({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
      {(title || subtitle) && (
        <div className="space-y-2">
          {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
          {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
        </div>
      )}
      {children}
    </div>
  );
}

