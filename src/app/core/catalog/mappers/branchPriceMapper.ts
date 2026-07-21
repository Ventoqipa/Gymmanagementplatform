import type { CatalogBranchPrice } from "../types";
import type { SubscriptionPeriodKey } from "../../../lib/plansStore";

export type BranchPricePeriodOption = {
  key: SubscriptionPeriodKey;
  label: string;
  frequencyName: string;
  priceBranchFrequencyID: number;
  /** Total del periodo (pago directo). */
  priceRegular: number;
  /** Precio domiciliado (mensual en UI). */
  priceDirectDebit: number;
  period: { days?: number; weeks?: number; months?: number };
  months?: number;
};

const FREQUENCY_ORDER = [
  "Day",
  "Week",
  "Month",
  "Quarter",
  "Semester",
  "Year",
] as const;

const FREQUENCY_META: Record<
  string,
  {
    key: SubscriptionPeriodKey;
    label: string;
    period: { days?: number; weeks?: number; months?: number };
    months?: number;
  }
> = {
  Day: { key: "1d", label: "1 día", period: { days: 1 } },
  Week: { key: "1w", label: "1 semana", period: { weeks: 1 } },
  Month: { key: "1m", label: "1 mes", period: { months: 1 }, months: 1 },
  Quarter: { key: "3m", label: "3 meses", period: { months: 3 }, months: 3 },
  Semester: { key: "6m", label: "6 meses", period: { months: 6 }, months: 6 },
  Year: { key: "12m", label: "12 meses", period: { months: 12 }, months: 12 },
};

/** Frecuencias usadas en pago domiciliado (sin 18 meses). */
const DIRECT_DEBIT_FREQUENCIES = new Set(["Semester", "Year"]);

function normalizeFrequencyName(name: string): string {
  const trimmed = name.trim();
  const found = FREQUENCY_ORDER.find(
    (f) => f.toLowerCase() === trimmed.toLowerCase(),
  );
  return found ?? trimmed;
}

export function mapBranchPriceToPeriodOption(
  price: CatalogBranchPrice,
): BranchPricePeriodOption | null {
  const frequencyName = normalizeFrequencyName(price.frequencyName);
  const meta = FREQUENCY_META[frequencyName];
  if (!meta || !price.priceBranchFrequencyID) return null;
  return {
    key: meta.key,
    label: meta.label,
    frequencyName,
    priceBranchFrequencyID: price.priceBranchFrequencyID,
    priceRegular: price.priceRegular,
    priceDirectDebit: price.priceDirectDebit,
    period: meta.period,
    months: meta.months,
  };
}

/** Opciones de pago directo: todas las frecuencias del catálogo. */
export function buildDirectPayPeriodOptions(
  prices: CatalogBranchPrice[],
): BranchPricePeriodOption[] {
  const mapped = prices
    .map(mapBranchPriceToPeriodOption)
    .filter((o): o is BranchPricePeriodOption => o != null);

  return mapped.sort((a, b) => {
    const ai = FREQUENCY_ORDER.indexOf(
      a.frequencyName as (typeof FREQUENCY_ORDER)[number],
    );
    const bi = FREQUENCY_ORDER.indexOf(
      b.frequencyName as (typeof FREQUENCY_ORDER)[number],
    );
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/** Opciones domiciliado: solo Semester (6m) y Year (12m). */
export function buildDirectDebitPeriodOptions(
  prices: CatalogBranchPrice[],
): BranchPricePeriodOption[] {
  return buildDirectPayPeriodOptions(prices).filter((o) =>
    DIRECT_DEBIT_FREQUENCIES.has(o.frequencyName),
  );
}

export function findPeriodOption(
  options: BranchPricePeriodOption[],
  key: SubscriptionPeriodKey | null | undefined,
): BranchPricePeriodOption | undefined {
  if (!key) return undefined;
  return options.find((o) => o.key === key);
}
