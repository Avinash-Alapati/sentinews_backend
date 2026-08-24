import type { ButtonHTMLAttributes } from "react";

export default function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "w-full rounded-lg border border-slate-700/70 bg-slate-800/60 px-4 py-2 font-medium text-slate-100 transition hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-slate-600/40 disabled:opacity-60 disabled:cursor-not-allowed " +
        (className ?? "")
      }
    />
  );
}

