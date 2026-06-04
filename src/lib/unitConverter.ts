export type PricingUnit = 'RFT' | 'RMT' | 'SQFT' | 'SQM';

export const CONVERSION_FACTORS = {
  M_TO_FT: 3.28084,
  FT_TO_M: 1 / 3.28084,
  SQM_TO_SQFT: 10.7639,
  SQFT_TO_SQM: 1 / 10.7639,
  MM_TO_FT: 0.00328084,
  FT_TO_MM: 304.8,
  INCH_TO_FT: 1 / 12,
  FT_TO_INCH: 12,
};

export const convertDimension = (val: number, from: string, to: string): number => {
  if (!val || from === to) return val;
  
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  
  // Standardize to feet first
  let inFeet = val;
  if (f === 'MTR' || f === 'METER' || f === 'M' || f === 'RMT') inFeet = val * CONVERSION_FACTORS.M_TO_FT;
  else if (f === 'MM') inFeet = val * CONVERSION_FACTORS.MM_TO_FT;
  else if (f === 'INCH' || f === 'IN') inFeet = val * CONVERSION_FACTORS.INCH_TO_FT;
  else if (f === 'SQM') inFeet = Math.sqrt(val * CONVERSION_FACTORS.SQM_TO_SQFT); // This is tricky for individual dims if total is SQM
  
  // Convert from feet to target
  if (t === 'MTR' || t === 'METER' || t === 'M' || t === 'RMT') return inFeet * CONVERSION_FACTORS.FT_TO_M;
  if (t === 'MM') return inFeet * CONVERSION_FACTORS.FT_TO_MM;
  if (t === 'INCH' || t === 'IN') return inFeet * CONVERSION_FACTORS.FT_TO_INCH;
  
  return inFeet;
};

export const convertRate = (rate: number, from: string, to: string, widthInFeet?: number): number => {
  if (from === to) return rate;

  const f = from.toUpperCase();
  const t = to.toUpperCase();

  // Metric detection
  const isMetricFrom = ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(f);
  const isMetricTo = ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(t);

  // Linear detection
  const isLinearFrom = ['RFT', 'RMT', 'MTR', 'METER'].includes(f);
  const isLinearTo = ['RFT', 'RMT', 'MTR', 'METER'].includes(t);

  // Standardization: First convert to base feet-based units
  let rateInBase = rate;
  if (f === 'RMT' || f === 'MTR' || f === 'METER') rateInBase = rate / CONVERSION_FACTORS.M_TO_FT;
  if (f === 'SQM' || f === 'SQ METER' || f === 'SQMTR') rateInBase = rate / CONVERSION_FACTORS.SQM_TO_SQFT;

  // Intermediate unit is now RFT or SQFT
  if (isLinearFrom && !isLinearTo && widthInFeet) {
    rateInBase = rateInBase / widthInFeet;
  } else if (!isLinearFrom && isLinearTo && widthInFeet) {
    rateInBase = rateInBase * widthInFeet;
  }

  // Final conversion to target unit
  if (t === 'RMT' || t === 'MTR' || t === 'METER') return rateInBase * CONVERSION_FACTORS.M_TO_FT;
  if (t === 'SQM' || t === 'SQ METER' || t === 'SQMTR') return rateInBase * CONVERSION_FACTORS.SQM_TO_SQFT;
  
  return rateInBase;
};

export const convertWidth = (width: number, from: string, to: string): number => {
  if (from === to) return width;
  
  const f = from.toUpperCase();
  const t = to.toUpperCase();

  const fromIsMetric = ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(f);
  const toIsMetric = ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(t);

  if (!fromIsMetric && toIsMetric) return width * CONVERSION_FACTORS.FT_TO_M;
  if (fromIsMetric && !toIsMetric) return width * CONVERSION_FACTORS.M_TO_FT;

  return width;
};

export const calculateItemTotal = (
  unit: string,
  rate: number,
  len: number,
  wid: number,
  pcs: number
): { qty: number; total: number } => {
  let qty = 0;
  const u = unit.toUpperCase();
  
  if (['RFT', 'RMT', 'MTR', 'METER'].includes(u)) {
    qty = len * pcs;
  } else if (['SQFT', 'SQM', 'SQ METER', 'SQMTR'].includes(u)) {
    qty = len * wid * pcs;
  }

  return {
    qty: Number(qty.toFixed(2)),
    total: Number((qty * rate).toFixed(2))
  };
};
