export type Dollars = number & { readonly __dollars: unique symbol };

export function dollars(value: number): Dollars {
  if (!Number.isInteger(value)) throw new Error(`Money must be an integer. Received ${value}.`);
  return value as Dollars;
}

export function parseDollars(raw: string): Dollars | null {
  const normalized = raw.replaceAll("$", "").replaceAll(",", "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? dollars(value) : null;
}

export function formatDollars(value: Dollars | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isOnIncrement(value: Dollars, increment: 50 | 100): boolean {
  return value >= 0 && value % increment === 0;
}
