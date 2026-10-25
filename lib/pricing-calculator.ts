/**
 * Easy Farm Unit Conversion and Basket Pricing Calculation Utility
 * Handles unit normalization (g/kg, ml/l, piece, bunch), item cost calculations,
 * basket gross margins, and side-by-side market reference comparisons.
 */

export interface ItemPricingInput {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  costPricePerUnit: number;
  costUnit?: string;
  sellingPricePerUnit?: number;
  marketPricePerUnit?: number;
  marketUnit?: string;
}

export interface CalculatedItemPricing {
  productName: string;
  quantity: number;
  unit: string;
  // Proportional purchase cost for this net quantity
  itemCost: number;
  costPricePerUnit: number;
  costUnit: string;
  // Proportional selling price for this net quantity
  itemSellingPrice: number;
  // Proportional market reference price for this net quantity
  itemMarketPrice: number;
  // Difference between Easy Farm selling price and market price
  priceDifference: number;
  percentageDifference: number;
  isCheaperThanMarket: boolean;
  savingsRupees: number;
}

export interface BasketPricingSummary {
  itemsCount: number;
  itemsCostTotal: number;
  packingCost: number;
  totalBasketCost: number;
  sellingPrice: number;
  suggestedSellingPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  isMarginHealthy: boolean;
  isBelowCost: boolean;
  totalMarketPrice: number;
  marketSavingsTotal: number;
  marketSavingsPct: number;
  itemsBreakdown: CalculatedItemPricing[];
}

/**
 * Normalizes unit string to standard abbreviation.
 */
export function normalizeUnit(raw: string = ''): string {
  const u = raw.trim().toLowerCase();
  if (['g', 'gram', 'grams', 'gm', 'gms'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilogram', 'kilograms', 'kgs'].includes(u)) return 'kg';
  if (['ml', 'millilitre', 'milliliter', 'millilitres'].includes(u)) return 'ml';
  if (['l', 'ltr', 'litre', 'liter', 'litres', 'liters'].includes(u)) return 'l';
  if (['bunch', 'bunches', 'kattu'].includes(u)) return 'bunch';
  if (['piece', 'pieces', 'pc', 'pcs', 'unit', 'units'].includes(u)) return 'piece';
  if (['pack', 'packs', 'packet', 'packets'].includes(u)) return 'pack';
  return u || 'kg';
}

/**
 * Computes conversion ratio from item unit to base cost unit.
 * E.g., if item is 500 'g' and cost is per 'kg', returns 0.5.
 */
export function getUnitConversionFactor(itemUnit: string, baseUnit: string): number {
  const uItem = normalizeUnit(itemUnit);
  const uBase = normalizeUnit(baseUnit);

  if (uItem === uBase) return 1;

  // Weight conversions
  if (uItem === 'g' && uBase === 'kg') return 0.001; // 500g / 1000 = 0.5kg
  if (uItem === 'kg' && uBase === 'g') return 1000;

  // Volume conversions
  if (uItem === 'ml' && uBase === 'l') return 0.001;
  if (uItem === 'l' && uBase === 'ml') return 1000;

  // Count/unit based (piece, bunch, pack) default 1:1 if matching type
  return 1;
}

/**
 * Calculates item proportional cost and market comparison for a specific quantity.
 */
export function calculateItemCost(item: ItemPricingInput): CalculatedItemPricing {
  const qty = Number(item.quantity) || 0;
  const costPerUnit = Number(item.costPricePerUnit) || 0;
  const costUnit = item.costUnit || item.unit || 'kg';
  const marketPerUnit = Number(item.marketPricePerUnit) || 0;
  const marketUnit = item.marketUnit || costUnit;
  const sellingPerUnit = Number(item.sellingPricePerUnit) || 0;

  // Conversion factors
  const costFactor = getUnitConversionFactor(item.unit, costUnit);
  const marketFactor = getUnitConversionFactor(item.unit, marketUnit);
  const sellingFactor = getUnitConversionFactor(item.unit, costUnit);

  // Proportional calculations rounded to 2 decimals
  const itemCost = Math.round(qty * costFactor * costPerUnit * 100) / 100;
  const itemSellingPrice =
    sellingPerUnit > 0
      ? Math.round(qty * sellingFactor * sellingPerUnit * 100) / 100
      : itemCost;

  const itemMarketPrice =
    marketPerUnit > 0
      ? Math.round(qty * marketFactor * marketPerUnit * 100) / 100
      : 0;

  // Market comparison
  const priceDiff = itemMarketPrice > 0 ? Math.round((itemSellingPrice - itemMarketPrice) * 100) / 100 : 0;
  const pctDiff =
    itemMarketPrice > 0
      ? Math.round(((itemSellingPrice - itemMarketPrice) / itemMarketPrice) * 1000) / 10
      : 0;

  const isCheaper = itemMarketPrice > 0 && itemSellingPrice < itemMarketPrice;
  const savings = isCheaper ? Math.round((itemMarketPrice - itemSellingPrice) * 100) / 100 : 0;

  return {
    productName: item.productName,
    quantity: qty,
    unit: normalizeUnit(item.unit),
    itemCost,
    costPricePerUnit: costPerUnit,
    costUnit: normalizeUnit(costUnit),
    itemSellingPrice,
    itemMarketPrice,
    priceDifference: priceDiff,
    percentageDifference: pctDiff,
    isCheaperThanMarket: isCheaper,
    savingsRupees: savings,
  };
}

/**
 * Calculates complete basket pricing metrics, gross margin, and market savings.
 */
export function calculateBasketPricing(
  items: ItemPricingInput[],
  currentSellingPrice: number,
  packingCost: number = 20,
  targetMarginPct: number = 25,
  pricingMode: 'auto' | 'automatic' | 'manual' = 'manual'
): BasketPricingSummary {
  const itemsBreakdown = items.map(calculateItemCost);

  const itemsCostTotal = itemsBreakdown.reduce((sum, item) => sum + item.itemCost, 0);
  const totalBasketCost = Math.round((itemsCostTotal + (Number(packingCost) || 0)) * 100) / 100;

  // Suggested selling price based on target gross margin: SellingPrice = Cost / (1 - Margin/100)
  const targetMarginDecimal = Math.min(0.9, Math.max(0.05, targetMarginPct / 100));
  const suggestedSellingPrice =
    totalBasketCost > 0
      ? Math.round(totalBasketCost / (1 - targetMarginDecimal))
      : 250;

  // Final selling price depends on pricing mode
  const effectiveSellingPrice =
    pricingMode === 'auto' || pricingMode === 'automatic'
      ? suggestedSellingPrice
      : Number(currentSellingPrice) || suggestedSellingPrice;

  const grossProfit = Math.round((effectiveSellingPrice - totalBasketCost) * 100) / 100;
  const grossMarginPct =
    effectiveSellingPrice > 0
      ? Math.round(((effectiveSellingPrice - totalBasketCost) / effectiveSellingPrice) * 1000) / 10
      : 0;

  const isBelowCost = effectiveSellingPrice < totalBasketCost;
  const isMarginHealthy = grossMarginPct >= targetMarginPct && !isBelowCost;

  // Market totals
  const totalMarketPrice = Math.round(
    itemsBreakdown.reduce((sum, item) => sum + item.itemMarketPrice, 0) * 100
  ) / 100;

  const marketSavingsTotal =
    totalMarketPrice > effectiveSellingPrice
      ? Math.round((totalMarketPrice - effectiveSellingPrice) * 100) / 100
      : 0;

  const marketSavingsPct =
    totalMarketPrice > 0
      ? Math.round(((totalMarketPrice - effectiveSellingPrice) / totalMarketPrice) * 1000) / 10
      : 0;

  return {
    itemsCount: items.length,
    itemsCostTotal: Math.round(itemsCostTotal * 100) / 100,
    packingCost: Number(packingCost) || 0,
    totalBasketCost,
    sellingPrice: effectiveSellingPrice,
    suggestedSellingPrice,
    grossProfit,
    grossMarginPct,
    isMarginHealthy,
    isBelowCost,
    totalMarketPrice,
    marketSavingsTotal,
    marketSavingsPct,
    itemsBreakdown,
  };
}

/**
 * Converts a quantity and unit into standard base units:
 * - Weight -> grams
 * - Volume -> millilitres
 * - Count -> units/pieces/bunches/packs
 */
export function convertToStandardBase(
  quantity: number | string = 1,
  unit: string = 'kg'
): { amount: number; type: 'weight' | 'count' | 'volume' | 'other' } {
  let qty = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
  let rawU = (unit || '').trim().toLowerCase();

  // If unit contains embedded number e.g. "500g" or "250g" or "2 bunches" or "1 pc"
  const embeddedMatch = rawU.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (embeddedMatch) {
    const embeddedQty = parseFloat(embeddedMatch[1]);
    const cleanUnit = embeddedMatch[2];
    qty = (isNaN(qty) || qty === 1) ? embeddedQty : qty * embeddedQty;
    rawU = cleanUnit;
  }

  if (isNaN(qty) || qty <= 0) qty = 1;
  const normU = normalizeUnit(rawU);

  if (normU === 'kg') return { amount: qty * 1000, type: 'weight' };
  if (normU === 'g') return { amount: qty, type: 'weight' };
  if (normU === 'l') return { amount: qty * 1000, type: 'volume' };
  if (normU === 'ml') return { amount: qty, type: 'volume' };
  if (['bunch', 'piece', 'pack'].includes(normU)) return { amount: qty, type: 'count' };

  return { amount: qty, type: 'other' };
}

/**
 * Centrally calculates proportional item price based on master catalogue price,
 * master unit, and basket-specific quantity & unit.
 * E.g.,
 * - Tomato ₹35/1kg at 1kg -> ₹35
 * - Carrot ₹35/500g at 0.5kg -> ₹35
 * - Green chilli ₹25/200g at 0.2kg -> ₹25
 * - Curry leaves ₹15/2 bunches at 2 bunches -> ₹15
 */
export function calculateItemPriceForQuantity(
  centralPrice: number,
  centralUnit: string,
  targetQuantity: number | string,
  targetUnit: string,
  explicitPrice?: number
): number {
  if (explicitPrice !== undefined && explicitPrice !== null && !isNaN(explicitPrice) && explicitPrice > 0) {
    return explicitPrice;
  }
  const basePrice = Number(centralPrice) || 0;
  if (basePrice <= 0) return 0;

  const baseStd = convertToStandardBase(1, centralUnit);
  const targetStd = convertToStandardBase(targetQuantity, targetUnit);

  if (baseStd.type === targetStd.type && baseStd.amount > 0) {
    const ratio = targetStd.amount / baseStd.amount;
    return Math.round(ratio * basePrice);
  }

  // Fallback to unit conversion factor
  const factor = getUnitConversionFactor(targetUnit, centralUnit);
  const rawQty = typeof targetQuantity === 'string' ? parseFloat(targetQuantity) || 1 : Number(targetQuantity) || 1;
  return Math.round(rawQty * factor * basePrice);
}

/**
 * Centrally calculates market reference price based on master catalogue market price.
 * Returns null if market price is missing, undefined, or 0 (so UI displays "Market price unavailable").
 */
export function calculateMarketPriceForQuantity(
  centralMarketPrice: number | null | undefined,
  centralUnit: string,
  targetQuantity: number | string,
  targetUnit: string,
  explicitComparePrice?: number | null
): number | null {
  if (explicitComparePrice !== undefined && explicitComparePrice !== null && !isNaN(explicitComparePrice) && explicitComparePrice > 0) {
    return explicitComparePrice;
  }
  const baseMarket = Number(centralMarketPrice) || 0;
  if (baseMarket <= 0) return null;

  const baseStd = convertToStandardBase(1, centralUnit);
  const targetStd = convertToStandardBase(targetQuantity, targetUnit);

  if (baseStd.type === targetStd.type && baseStd.amount > 0) {
    const ratio = targetStd.amount / baseStd.amount;
    const calculated = Math.round(ratio * baseMarket);
    return calculated > 0 ? calculated : null;
  }

  const factor = getUnitConversionFactor(targetUnit, centralUnit);
  const rawQty = typeof targetQuantity === 'string' ? parseFloat(targetQuantity) || 1 : Number(targetQuantity) || 1;
  const calculated = Math.round(rawQty * factor * baseMarket);
  return calculated > 0 ? calculated : null;
}

/**
 * Format currency in Indian Rupee format (₹)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Calculates the next upcoming Sunday delivery date (YYYY-MM-DD)
 */
export function getNextDeliverySunday(fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 7 : (7 - day);
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toISOString().split('T')[0];
}

