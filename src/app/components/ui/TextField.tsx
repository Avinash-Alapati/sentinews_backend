import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function TextField({ label, className, ...props }: Props) {
  return (
    <div className="space-y-2">
      {label ? <div className="text-xs text-slate-500">{label}</div> : null}
      <input
        {...props}
        className={
          "w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 " +
          (className ?? "")
        }
      />
    </div>
  );
}

