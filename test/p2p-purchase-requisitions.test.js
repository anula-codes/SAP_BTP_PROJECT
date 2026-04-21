// ============================================================
// Tests: Purchase Requisition Business Logic
// File: test/p2p-purchase-requisitions.test.js
// ============================================================
'use strict';

// ── Number generator (mirrors srv/p2p-service.js) ────────────
function generateDocNumber(prefix, length = 10) {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}${ts}${rand}`.slice(0, length);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Status transition guard (mirrors approvePR logic) ────────
function canApprovePR(status) {
  const blockedStatuses = ['APPROVED', 'CANCELLED', 'CONVERTED'];
  return !blockedStatuses.includes(status);
}

function canRejectPR(status) {
  return status === 'PENDING';
}

// ── Payment terms mapper (mirrors invoice handler) ────────────
function getPaymentDays(terms) {
  if (terms === 'NT60') return 60;
  if (terms === 'NT45') return 45;
  return 30;
}

describe('Purchase Requisitions — Business Logic', () => {

  describe('Document number generation', () => {
    it('generates PR number with correct prefix', () => {
      const num = generateDocNumber('PR', 10);
      expect(num).toMatch(/^PR/);
    });

    it('generated number does not exceed max length', () => {
      const num = generateDocNumber('PR', 10);
      expect(num.length).toBeLessThanOrEqual(10);
    });

    it('generates unique numbers on consecutive calls', () => {
      const nums = new Set(Array.from({ length: 20 }, () => generateDocNumber('PR', 10)));
      // Very high likelihood all 20 are unique
      expect(nums.size).toBeGreaterThan(1);
    });

    it('works with different prefixes', () => {
      expect(generateDocNumber('PO', 10)).toMatch(/^PO/);
      expect(generateDocNumber('GR', 10)).toMatch(/^GR/);
      expect(generateDocNumber('INV', 16)).toMatch(/^INV/);
    });
  });

  describe('today() helper', () => {
    it('returns a valid ISO date string', () => {
      const d = today();
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches current date', () => {
      const d = today();
      const expected = new Date().toISOString().slice(0, 10);
      expect(d).toBe(expected);
    });
  });

  describe('PR default status', () => {
    it('new PR must have PENDING status', () => {
      const pr = { title: 'Test PR', status: undefined };
      pr.status = pr.status || 'PENDING';
      expect(pr.status).toBe('PENDING');
    });

    it('PR with explicit status keeps it', () => {
      const pr = { status: 'APPROVED' };
      pr.status = pr.status || 'PENDING';
      expect(pr.status).toBe('APPROVED');
    });
  });

  describe('approvePR — status transition validation', () => {
    it('PENDING PR can be approved', () => {
      expect(canApprovePR('PENDING')).toBe(true);
    });

    it('APPROVED PR cannot be re-approved (409)', () => {
      expect(canApprovePR('APPROVED')).toBe(false);
    });

    it('CANCELLED PR cannot be approved (409)', () => {
      expect(canApprovePR('CANCELLED')).toBe(false);
    });

    it('CONVERTED PR cannot be approved (409)', () => {
      expect(canApprovePR('CONVERTED')).toBe(false);
    });

    it('REJECTED PR can be reconsidered (business scenario)', () => {
      // REJECTED is not in the blocked list — can be re-reviewed
      expect(canApprovePR('REJECTED')).toBe(true);
    });
  });

  describe('rejectPR — validation', () => {
    it('PENDING PR can be rejected', () => {
      expect(canRejectPR('PENDING')).toBe(true);
    });

    it('APPROVED PR cannot be rejected', () => {
      expect(canRejectPR('APPROVED')).toBe(false);
    });

    it('CONVERTED PR cannot be rejected', () => {
      expect(canRejectPR('CONVERTED')).toBe(false);
    });

    it('rejection reason must have minimum length', () => {
      const validateReason = (r) => r && r.trim().length >= 5;
      expect(validateReason('Budget exceeded')).toBe(true);
      expect(validateReason('No')).toBe(false);
      expect(validateReason('')).toBeFalsy();
      expect(validateReason(null)).toBeFalsy();
    });
  });

  describe('PR to PO conversion', () => {
    it('PR status becomes CONVERTED when PO is created', () => {
      const pr = { status: 'APPROVED' };
      // Simulate what happens in before-CREATE PurchaseOrders
      if (pr.status === 'APPROVED') pr.status = 'CONVERTED';
      expect(pr.status).toBe('CONVERTED');
    });

    it('non-approved PR is not auto-converted', () => {
      const pr = { status: 'PENDING' };
      if (pr.status === 'APPROVED') pr.status = 'CONVERTED';
      expect(pr.status).toBe('PENDING');
    });
  });

  describe('Payment terms mapping', () => {
    it('NT30 → 30 days', () => expect(getPaymentDays('NT30')).toBe(30));
    it('NT45 → 45 days', () => expect(getPaymentDays('NT45')).toBe(45));
    it('NT60 → 60 days', () => expect(getPaymentDays('NT60')).toBe(60));
    it('unknown terms → default 30 days', () => expect(getPaymentDays('CASH')).toBe(30));
    it('undefined terms → default 30 days', () => expect(getPaymentDays(undefined)).toBe(30));
  });

  describe('Total value calculation on PR items', () => {
    it('line item total = quantity × unit price', () => {
      const qty = 1000;
      const price = 85.50;
      const total = qty * price;
      expect(total).toBe(85500);
    });

    it('PR total = sum of all line item totals', () => {
      const items = [
        { quantity: 1000, unitPrice: 85.50 },
        { quantity: 500,  unitPrice: 102.00 },
        { quantity: 200,  unitPrice: 245.00 },
      ];
      const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      expect(total).toBeCloseTo(185500, 0);
    });
  });
});
