/**
 * vine-marketplace — Price Calculator
 *
 * Calculates listing price for a product:
 *   - Paid orders:      listing = paid_price * (1 - DISCOUNT_RATE)
 *   - Vine (free) orders: listing = vine_tax_value * (1 - DISCOUNT_RATE)
 *     (Amazon issues a 1099 for the fair-market value, that IS the cost.)
 *
 * DISCOUNT_RATE defaults to 0.20 (20% off) per owner spec.
 */

'use strict';

const DISCOUNT_RATE = parseFloat(process.env.LISTING_DISCOUNT_RATE || '0.20');
const MIN_LISTING_PRICE = parseFloat(process.env.MIN_LISTING_PRICE || '1.00');

/**
 * @param {object} product
 * @param {number} product.paidPrice      - Amount actually charged (0 for Vine free items)
 * @param {number} product.vineTaxValue   - FMV reported on 1099 for Vine items (may be 0 if unknown)
 * @param {boolean} product.isVine        - true = Amazon Vine freebie
 * @returns {{ listingPrice: number, costBasis: number, discountApplied: number }}
 */
function calculateListingPrice(product) {
  const { paidPrice = 0, vineTaxValue = 0, isVine = false } = product;

  // Determine cost basis
  let costBasis;
  if (isVine) {
    // For Vine items the "cost" to the seller is the taxable fair-market value.
    // If Amazon hasn't provided the FMV yet, fall back to paidPrice (0).
    costBasis = vineTaxValue > 0 ? vineTaxValue : paidPrice;
  } else {
    costBasis = paidPrice;
  }

  // Apply discount
  const discount = costBasis * DISCOUNT_RATE;
  const rawPrice = costBasis - discount;

  // Enforce minimum
  const listingPrice = Math.max(rawPrice, MIN_LISTING_PRICE);

  return {
    listingPrice: parseFloat(listingPrice.toFixed(2)),
    costBasis: parseFloat(costBasis.toFixed(2)),
    discountApplied: parseFloat((costBasis - listingPrice).toFixed(2)),
    discountRate: DISCOUNT_RATE,
    isVine,
  };
}

/**
 * Format price as USD string for Marketplace listing.
 */
function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

module.exports = { calculateListingPrice, formatUSD, DISCOUNT_RATE };
