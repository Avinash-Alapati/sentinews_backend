import type { ButtonHTMLAttributes } from "react";

export default function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/35 disabled:opacity-60 disabled:cursor-not-allowed " +
        (className ?? "")
      }
    />
  );
}

