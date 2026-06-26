const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/**
 * Normalize plan pricing fields without writing to DB.
 *
 * Rules:
 * - If stored finalPrice is present and non-zero, prefer it.
 * - Never return finalPrice = 0 when basePrice > 0.
 * - If tax is disabled, finalPrice = basePrice.
 * - If finalPrice is missing/zero but basePrice > 0, compute it.
 */
export const normalizePlanPricing = (raw = {}) => {
  const basePrice = Number(raw.basePrice ?? (raw.price ?? 0)) || 0;

  const taxEnabled = Boolean(raw.tax?.enabled ?? raw.taxEnabled ?? false);
  const taxName = taxEnabled ? String(raw.tax?.name ?? raw.taxName ?? 'GST') : undefined;
  const taxPercentage = taxEnabled ? Number(raw.tax?.percentage ?? raw.taxPercentage ?? 0) || 0 : 0;

  const computedTaxAmount = taxEnabled ? round2((basePrice * taxPercentage) / 100) : 0;
  const computedFinalPrice = round2(basePrice + computedTaxAmount);

  const storedFinalCandidate = Number(raw.finalPrice ?? raw.price ?? 0) || 0;
  
  // Fix: Only use stored finalPrice if it's non-zero OR if basePrice is actually zero
  // If basePrice > 0 but storedFinal is 0, compute it to avoid showing ₹0
  const shouldUseStoredFinal = storedFinalCandidate > 0 && basePrice > 0 ? false : (storedFinalCandidate > 0 || basePrice === 0);

  const finalPrice = shouldUseStoredFinal
    ? storedFinalCandidate
    : computedFinalPrice;

  const taxAmount = taxEnabled
    ? (shouldUseStoredFinal && Number(raw.tax?.amount ?? raw.taxAmount ?? 0) > 0 ? Number(raw.tax?.amount ?? raw.taxAmount ?? 0) : computedTaxAmount)
    : 0;

  return {
    basePrice,
    taxEnabled,
    taxName,
    taxPercentage,
    taxAmount: round2(taxAmount),
    finalPrice: round2(finalPrice),
    // keep legacy "price" aligned
    price: round2(finalPrice),
    tax: {
      enabled: taxEnabled,
      name: taxName,
      percentage: taxPercentage,
      amount: round2(taxAmount),
    },
  };
};

