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

/**
 * Formats any date string or Date object into DD/MM/YYYY format.
 * Examples:
 *   "2026-09-02" -> "02/09/2026"
 *   "2026-09-02T10:30:00Z" -> "02/09/2026"
 */
export function formatDDMMYYYY(rawDate) {
  if (!rawDate || rawDate === '—' || rawDate === '--' || rawDate === 'N/A') return '—';
  try {
    const str = String(rawDate).trim();
    const isoDatePart = str.split('T')[0].split(' ')[0];
    const parts = isoDatePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    if (str.includes('/')) {
      const slashParts = str.split('/');
      if (slashParts.length === 3) {
        if (slashParts[0].length === 4) {
          return `${slashParts[2].padStart(2, '0')}/${slashParts[1].padStart(2, '0')}/${slashParts[0]}`;
        }
        return `${slashParts[0].padStart(2, '0')}/${slashParts[1].padStart(2, '0')}/${slashParts[2]}`;
      }
    }
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      const day = String(dObj.getDate()).padStart(2, '0');
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const year = dObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return str;
  } catch {
    return String(rawDate);
  }
}

