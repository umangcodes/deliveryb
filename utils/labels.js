// /lib/utils/labelUtils.js
const { DateTime } = require('luxon');

// basic string normalizer
function asString(x) {
    return (x ?? '').toString().trim();
  }
  
  // ensure items is an array<string>; accept comma-separated string too
  function asStringArray(arr) {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr.map(asString).filter(Boolean);
    return asString(arr).split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // null if invalid/missing
  function parseDateMaybe(x) {
    if (!x) return null;
    if (x instanceof Date && !isNaN(x)) return x;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // your business rule: items string has non-numeric content
  function hasAnyNonNumeric(itemsStr) {
    return /[^\d,\s]/.test(String(itemsStr || ''));
  }
  
  /**
   * Normalize a single incoming label payload to your schema’s shape.
   * - validates minimal required fields
   * - coerces types
   */
  function normalizeLabelInput(input) {
    const customerName = asString(input.customerName);
    if (!customerName) throw new Error('customerName is required');
  
    const phoneNumber = asString(input.phoneNumber);
    const notes       = asString(input.notes);
    const zone        = asString(input.zone);
    const items       = asStringArray(input.items);
    if (!zone) throw new Error('zone is required');
    if (!items.length) throw new Error('items must be a non-empty array');
  
    const copies    = Math.max(1, Number(input.copies ?? 1));
    const labelDate = parseDateMaybe(input.labelDate) || DateTime.now().setZone('America/Toronto').startOf('day').toJSDate();;
  
    // status (accept partial; default rest)
    const statusIn = input.status || {};
    const status = {
      queued:      typeof statusIn.queued === 'boolean' ? statusIn.queued : true,
      printed:     !!statusIn.printed,
      printedAt:   parseDateMaybe(statusIn.printedAt) || null,
      lastPrinted: parseDateMaybe(statusIn.lastPrinted) || null,
      printedOn:   asString(statusIn.printedOn) || null,
      printer:     asString(statusIn.printer) || null,
      reprints:    Number(statusIn.reprints ?? 0),
    };
  
    const lockedBy = asString(input.lockedBy) || null;
    const lockedAt = parseDateMaybe(input.lockedAt) || null;
  
    return {
      customerName,
      phoneNumber,
      notes,
      items,
      zone,
      copies,
      labelDate,
      status,
      lockedBy,
      lockedAt,
    };
  }
  
  module.exports = {
    asString,
    asStringArray,
    parseDateMaybe,
    hasAnyNonNumeric,
    normalizeLabelInput,
  };
  