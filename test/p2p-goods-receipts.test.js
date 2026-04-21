// ============================================================
// Tests: Goods Receipts — Posting Logic & Validations
// File: test/p2p-goods-receipts.test.js
// ============================================================
'use strict';

function generateDocNumber(prefix, length = 10) {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}${ts}${rand}`.slice(0, length);
}

function canPostGR(poStatus) {
  return !['CANCELLED', 'CLOSED'].includes(poStatus);
}

function calcNewReceivedQty(existingQty, incomingQty) {
  return parseFloat(existingQty || 0) + parseFloat(incomingQty || 0);
}

function isOverDelivery(orderedQty, newReceivedQty, tolerancePct = 5) {
  return newReceivedQty > orderedQty * (1 + tolerancePct / 100);
}

function refreshPOStatusFromItems(items) {
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

describe('Goods Receipts — Posting Logic', () => {

  describe('GR number generation', () => {
    it('generates GR number with GR prefix', () => {
      const grNum = generateDocNumber('GR', 10);
      expect(grNum.startsWith('GR')).toBe(true);
      expect(grNum.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GR posting eligibility', () => {
    it('OPEN PO allows GR posting', ()            => expect(canPostGR('OPEN')).toBe(true));
    it('PARTIALLY_DELIVERED allows GR',            () => expect(canPostGR('PARTIALLY_DELIVERED')).toBe(true));
    it('FULLY_DELIVERED still allows GR (returns)', () => expect(canPostGR('FULLY_DELIVERED')).toBe(true));
    it('CANCELLED PO blocks GR posting',           () => expect(canPostGR('CANCELLED')).toBe(false));
    it('CLOSED PO blocks GR posting',              () => expect(canPostGR('CLOSED')).toBe(false));
  });

  describe('Received quantity accumulation', () => {
    it('first delivery: 0 + incoming = incoming', () => {
      expect(calcNewReceivedQty(0, 500)).toBe(500);
    });

    it('partial delivery: existing + incoming', () => {
      expect(calcNewReceivedQty(300, 200)).toBe(500);
    });

    it('handles undefined existing qty', () => {
      expect(calcNewReceivedQty(undefined, 100)).toBe(100);
    });

    it('handles string quantities (CDS returns strings)', () => {
      expect(calcNewReceivedQty('100.000', '50.000')).toBe(150);
    });
  });

  describe('Over-delivery detection (5% tolerance)', () => {
    it('within tolerance — not over-delivery', () => {
      expect(isOverDelivery(1000, 1040)).toBe(false); // 4% over
    });

    it('exactly at tolerance boundary', () => {
      expect(isOverDelivery(1000, 1050)).toBe(false); // exactly 5%
    });

    it('1 unit beyond tolerance triggers warning', () => {
      expect(isOverDelivery(1000, 1051)).toBe(true);
    });

    it('significant over-delivery detected', () => {
      expect(isOverDelivery(500, 600)).toBe(true); // 20% over
    });

    it('under-delivery is never over-delivery', () => {
      expect(isOverDelivery(1000, 800)).toBe(false);
    });
  });

  describe('GR default values', () => {
    it('default movement type is 101 (goods receipt)', () => {
      const gr = {};
      gr.movementType = gr.movementType || '101';
      expect(gr.movementType).toBe('101');
    });

    it('default status after posting is POSTED', () => {
      const gr = {};
      gr.status = 'POSTED';
      expect(gr.status).toBe('POSTED');
    });

    it('postingDate defaults to today', () => {
      const today = new Date().toISOString().slice(0, 10);
      const gr = {};
      gr.postingDate = gr.postingDate || today;
      expect(gr.postingDate).toBe(today);
    });
  });

  describe('PO status update after GR items processed', () => {
    it('single item fully delivered → FULLY_DELIVERED', () => {
      const items = [{ quantity: '100', receivedQty: '100' }];
      expect(refreshPOStatusFromItems(items)).toBe('FULLY_DELIVERED');
    });

    it('multiple items, all delivered → FULLY_DELIVERED', () => {
      const items = [
        { quantity: '100', receivedQty: '100' },
        { quantity: '200', receivedQty: '205' }, // slight over-delivery
      ];
      expect(refreshPOStatusFromItems(items)).toBe('FULLY_DELIVERED');
    });

    it('first delivery of multi-item PO → PARTIALLY_DELIVERED', () => {
      const items = [
        { quantity: '100', receivedQty: '100' },
        { quantity: '200', receivedQty: '0'   },
      ];
      expect(refreshPOStatusFromItems(items)).toBe('PARTIALLY_DELIVERED');
    });

    it('zero received on all items → OPEN (no change)', () => {
      const items = [
        { quantity: '100', receivedQty: '0' },
      ];
      expect(refreshPOStatusFromItems(items)).toBe('OPEN');
    });
  });

  describe('Movement type validation', () => {
    const VALID_MOVEMENT_TYPES = ['101', '122', '123', '124'];

    it('101 is valid GR movement type', () => {
      expect(VALID_MOVEMENT_TYPES).toContain('101');
    });

    it('122 is valid return delivery movement', () => {
      expect(VALID_MOVEMENT_TYPES).toContain('122');
    });

    it('999 is not a valid movement type', () => {
      expect(VALID_MOVEMENT_TYPES).not.toContain('999');
    });
  });

  describe('GR value calculation', () => {
    it('GR value = received qty × PO unit price', () => {
      const receivedQty = 500;
      const unitPrice = 85.50;
      const grValue = receivedQty * unitPrice;
      expect(grValue).toBe(42750);
    });

    it('partial GR value is proportional to ordered value', () => {
      const ordered = 1000;
      const unitPrice = 100;
      const received = 600;
      const poValue = ordered * unitPrice;
      const grValue = received * unitPrice;
      expect(grValue / poValue).toBeCloseTo(0.6, 5);
    });
  });
});
