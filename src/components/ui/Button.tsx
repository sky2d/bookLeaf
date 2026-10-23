import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-cloth text-white hover:bg-cloth-deep disabled:bg-cloth/50",
  secondary: "bg-surface text-ink border border-rule-strong hover:border-ink-soft disabled:text-ink-faint",
  quiet: "text-ink-soft hover:text-ink hover:bg-ink/5 disabled:text-ink-faint",
  danger: "bg-proof text-white hover:bg-proof/90 disabled:bg-proof/50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
