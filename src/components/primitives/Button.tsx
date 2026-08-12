import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }>;

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`button button--${variant} ${className}`.trim()} {...props} />;
}
