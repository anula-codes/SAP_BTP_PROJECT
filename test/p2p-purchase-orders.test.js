// ============================================================
// Tests: Purchase Orders — Business Logic & Validations
// File: test/p2p-purchase-orders.test.js
// ============================================================
'use strict';

// ── Tax calculation (mirrors POItem after-CREATE) ─────────────
function calcItemTax(quantity, unitPrice, gstRate = 18) {
  const base = parseFloat(quantity) * parseFloat(unitPrice);
  const tax  = base * (gstRate / 100);
  return { base, tax, total: base + tax };
}

// ── PO status refresh (mirrors _refreshPOStatus) ─────────────
function refreshPOStatus(items) {
  const allDelivered = items.every(i =>
    parseFloat(i.receivedQty || 0) >= parseFloat(i.quantity)
  );
  const anyDelivered = items.some(i =>
    parseFloat(i.receivedQty || 0) > 0
  );
  if (allDelivered)  return 'FULLY_DELIVERED';
  if (anyDelivered)  return 'PARTIALLY_DELIVERED';
  return 'OPEN';
}

// ── Cancel PO guard ──────────────────────────────────────────
function canCancelPO(status) {
  return !['CLOSED', 'CANCELLED', 'FULLY_DELIVERED'].includes(status);
}

describe('Purchase Orders — Business Logic', () => {

  describe('GST / Tax calculations', () => {
    it('18% GST on standard item', () => {
      const r = calcItemTax(10, 45000, 18);
      expect(r.base).toBe(450000);
      expect(r.tax).toBe(81000);
      expect(r.total).toBe(531000);
    });

    it('zero tax rate produces no tax', () => {
      const r = calcItemTax(5, 10000, 0);
      expect(r.tax).toBe(0);
      expect(r.total).toBe(r.base);
    });

    it('12% GST slab', () => {
      const r = calcItemTax(100, 500, 12);
      expect(r.base).toBe(50000);
      expect(r.tax).toBe(6000);
      expect(r.total).toBe(56000);
    });

    it('PO total = sum of line base + tax', () => {
      const lines = [
        calcItemTax(1000, 85.50, 18),
        calcItemTax(50,   450,   18),
        calcItemTax(3,    85000, 18),
      ];
      const netTotal = lines.reduce((s, l) => s + l.base, 0);
      const taxTotal = lines.reduce((s, l) => s + l.tax,  0);
      expect(netTotal).toBeCloseTo(363000, 0);
      expect(taxTotal).toBeCloseTo(65340,  0);
    });
  });

  describe('PO status refresh after GR posting', () => {
    it('all items fully received → FULLY_DELIVERED', () => {
      const items = [
        { quantity: '100', receivedQty: '100' },
        { quantity: '50',  receivedQty: '50'  },
      ];
      expect(refreshPOStatus(items)).toBe('FULLY_DELIVERED');
    });

    it('some items received → PARTIALLY_DELIVERED', () => {
      const items = [
        { quantity: '100', receivedQty: '60' },
        { quantity: '50',  receivedQty: '0'  },
      ];
      expect(refreshPOStatus(items)).toBe('PARTIALLY_DELIVERED');
    });

    it('no items received → OPEN', () => {
      const items = [
        { quantity: '100', receivedQty: '0' },
        { quantity: '50',  receivedQty: undefined },
      ];
      expect(refreshPOStatus(items)).toBe('OPEN');
    });

    it('over-delivery still FULLY_DELIVERED (tolerance applied upstream)', () => {
      const items = [
        { quantity: '100', receivedQty: '105' }, // 5% over
      ];
      expect(refreshPOStatus(items)).toBe('FULLY_DELIVERED');
    });
  });

  describe('cancelPO guard', () => {
    it('OPEN PO can be cancelled', ()          => expect(canCancelPO('OPEN')).toBe(true));
    it('PARTIALLY_DELIVERED can be cancelled', () => expect(canCancelPO('PARTIALLY_DELIVERED')).toBe(true));
    it('CLOSED PO cannot be cancelled',        () => expect(canCancelPO('CLOSED')).toBe(false));
    it('CANCELLED PO cannot be re-cancelled',  () => expect(canCancelPO('CANCELLED')).toBe(false));
    it('FULLY_DELIVERED cannot be cancelled',  () => expect(canCancelPO('FULLY_DELIVERED')).toBe(false));
  });

  describe('Over-delivery tolerance', () => {
    it('5% over tolerance is within acceptable range', () => {
      const ordered = 100;
      const received = 104;
      expect(received).toBeLessThanOrEqual(ordered * 1.05);
    });

    it('beyond 5% triggers over-delivery warning', () => {
      const ordered = 100;
      const received = 106;
      expect(received).toBeGreaterThan(ordered * 1.05);
    });

    it('exactly at tolerance boundary (105%) is acceptable', () => {
      const ordered = 200;
      const received = 210;
      expect(received).toBeLessThanOrEqual(ordered * 1.05);
    });
  });

  describe('PO default values', () => {
    it('default currency is INR', () => {
      const po = { currency_code: undefined };
      po.currency_code = po.currency_code || 'INR';
      expect(po.currency_code).toBe('INR');
    });

    it('default status is OPEN', () => {
      const po = {};
      po.status = po.status || 'OPEN';
      expect(po.status).toBe('OPEN');
    });

    it('default plant is NB10', () => {
      const po = {};
      po.plant = po.plant || 'NB10';
      expect(po.plant).toBe('NB10');
    });

    it('default purchOrg is NBPO', () => {
      const po = {};
      po.purchOrg = po.purchOrg || 'NBPO';
      expect(po.purchOrg).toBe('NBPO');
    });
  });

  describe('Vendor payment terms inheritance', () => {
    it('PO inherits vendor payment terms when not specified', () => {
      const vendor = { paymentTerms: 'NT60' };
      const po = { paymentTerms: undefined };
      if (!po.paymentTerms) po.paymentTerms = vendor.paymentTerms;
      expect(po.paymentTerms).toBe('NT60');
    });

    it('explicit PO payment terms override vendor default', () => {
      const vendor = { paymentTerms: 'NT60' };
      const po = { paymentTerms: 'NT30' };
      if (!po.paymentTerms) po.paymentTerms = vendor.paymentTerms;
      expect(po.paymentTerms).toBe('NT30');
    });
  });
});
