const PRODUCT_MAP = {
  "The Foundation — $597": { packageName: "The Foundation - $597", ghlTag: "paid-foundation", triggersAria: true },
  "The Foundation Access Plan": { packageName: "The Foundation - Access Plan ($348.50 x2)", ghlTag: "paid-foundation", triggersAria: true },
  "The Foundation Access Package. 1st Payment": { packageName: "The Foundation - Access Plan (1st Payment)", ghlTag: "paid-foundation", triggersAria: true },
  "The Blueprint Package": { packageName: "The Blueprint - $997", ghlTag: "paid-blueprint", triggersAria: true },
  "Black Card Elite — $1,500": { packageName: "Black Card Elite - $1,500", ghlTag: "paid-black-card", triggersAria: true },
  "Black Card Elite — $800 — Access Plan | $1,600 total": { packageName: "Black Card Elite - Access Plan ($800 x2)", ghlTag: "paid-black-card", triggersAria: true },
};

const AMOUNT_MAP_FALLBACK = {
  348.50: { packageName: "The Foundation - Access Plan", ghlTag: "paid-foundation", triggersAria: true },
  597: { packageName: "The Foundation - $597", ghlTag: "paid-foundation", triggersAria: true },
  800: { packageName: "Black Card Elite - Access Plan", ghlTag: "paid-black-card", triggersAria: true },
  997: { packageName: "The Blueprint - $997", ghlTag: "paid-blueprint", triggersAria: true },
  1500: { packageName: "Black Card Elite - $1,500", ghlTag: "paid-black-card", triggersAria: true },
};

const UNKNOWN = { packageName: "Unknown — Manual Review Needed", ghlTag: null, triggersAria: false };

function mapPaymentToPackage({ productName, amountCents }) {
  if (productName && PRODUCT_MAP[productName]) return PRODUCT_MAP[productName];
  const dollars = (amountCents || 0) / 100;
  if (AMOUNT_MAP_FALLBACK[dollars]) return AMOUNT_MAP_FALLBACK[dollars];
  return UNKNOWN;
}

module.exports = { mapPaymentToPackage };
