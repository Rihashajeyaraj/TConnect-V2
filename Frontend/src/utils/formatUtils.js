/**
 * Formatting and validation utilities for TwiteConnect
 */

/**
 * Formats a numeric or string value into Indian Rupees with correct commas.
 * Handles inputs with existing symbols/commas gracefully.
 * Example: 150000 -> ₹1,50,000
 *          "₹4,50,000" -> ₹4,50,000
 */
export function formatCurrencyINR(value) {
  if (value === null || value === undefined || value === '') {
    return '₹0';
  }
  // Strip currency symbol, commas, and whitespace
  const cleaned = String(value).replace(/[₹,\s]/g, '');
  const numValue = Math.round(Number(cleaned));
  if (isNaN(numValue)) {
    return '₹0';
  }
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `₹${formatter.format(numValue)}`;
}

/**
 * Validates that a phone number is exactly 10 digits.
 */
export function validatePhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Cleans phone inputs by keeping digits only and limiting to 10 characters.
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(0, 10);
}
