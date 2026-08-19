export type Dollars = number & { readonly __dollars: unique symbol };

export function dollars(value: number): Dollars {
  if (!Number.isInteger(value)) throw new Error(`Money must be an integer. Received ${value}.`);
  return value as Dollars;
}

/**
 * A whole dollar amount, however a child writes one.
 *
 * `$`, thousands commas and a run of zero cents are all ways of writing the same number, and
 * this used to refuse the last of them: a student who typed `630.00` — money, correctly
 * punctuated — was told *"Enter a whole dollar amount, like 1400."* about an amount that is
 * one. Being corrected for writing money the way money is written is a small humiliation
 * with no lesson in it.
 *
 * Real cents are still refused rather than rounded. This world is priced in whole dollars and
 * silently turning `630.50` into `631` would change a student's answer without telling them.
 */
export function parseDollars(raw: string): Dollars | null {
  const normalized = raw.replaceAll("$", "").replaceAll(",", "").trim();
  const whole = /^(\d+)(?:\.0+)?$/.exec(normalized)?.[1];
  if (whole === undefined) return null;
  const value = Number(whole);
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
