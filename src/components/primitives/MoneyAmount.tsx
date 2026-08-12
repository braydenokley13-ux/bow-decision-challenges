import { formatDollars } from "../../domain/core/money";

export function MoneyAmount({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`money ${className}`.trim()}>{formatDollars(value)}</span>;
}
