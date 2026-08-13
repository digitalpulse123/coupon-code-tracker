import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

// GBP, two decimal places (SPEC section 14).
export function formatMoneyGB(value: DecimalLike): string {
  if (value === null || value === undefined) return "";
  return `£${Number(value).toFixed(2)}`;
}

// Percentage without trailing zeros, e.g. 20% or 12.5%.
export function formatPercent(value: DecimalLike): string {
  if (value === null || value === undefined) return "";
  return `${Number(value)}%`;
}

// DD/MM/YYYY from a date-only value, read in UTC so it never shifts a day.
export function formatDateGB(value: Date | null | undefined): string {
  if (!value) return "";
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = value.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
