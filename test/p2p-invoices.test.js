// ============================================================
// Tests: Invoice Verification — 3-Way Match Logic
// File: test/p2p-invoices.test.js
// ============================================================
'use strict';

function calcInvoiceTotals(baseAmount, gstRate = 18) {
  const base = parseFloat(baseAmount);
  const tax  = parseFloat((base * gstRate / 100).toFixed(2));
  const total = parseFloat((base + tax).toFixed(2));
  return { base, tax, total };
}

function calcDueDate(postingDate, paymentTerms) {
  const days = paymentTerms === 'NT60' ? 60 : paymentTerms === 'NT45' ? 45 : 30;
  const d = new Date(postingDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function canApproveInvoice(status) {
  return status === 'PENDING';
}

function canBlockInvoice(status) {
  return ['PENDING', 'APPROVED'].includes(status);
}

function threeWayMatchCheck(po, gr, invoice) {
  const vendorMatch   = po.vendorID === invoice.vendorID;
  const qtyMatch      = Math.abs(parseFloat(gr.totalValue) - parseFloat(invoice.baseAmount)) < 0.01;
  const poRefMatch    = invoice.poReference === po.poNumber;
  const grRefMatch    = invoice.grReference === gr.grNumber;
  return { vendorMatch, qtyMatch, poRefMatch, grRefMatch,
           allMatch: vendorMatch && qtyMatch && poRefMatch && grRefMatch };
}

describe('Invoice Verification — 3-Way Match', () => {

  describe('Invoice total calculation', () => {
    it('18% GST on base amount', () => {
      const r = calcInvoiceTotals(100000, 18);
      expect(r.base).toBe(100000);
      expect(r.tax).toBe(18000);
      expect(r.total).toBe(118000);
    });

    it('5% GST slab (essential goods)', () => {
      const r = calcInvoiceTotals(50000, 5);
      expect(r.tax).toBe(2500);
      expect(r.total).toBe(52500);
    });

    it('12% GST slab', () => {
      const r = calcInvoiceTotals(200000, 12);
      expect(r.tax).toBe(24000);
      expect(r.total).toBe(224000);
    });

    it('zero GST (exempt goods/services)', () => {
      const r = calcInvoiceTotals(75000, 0);
      expect(r.tax).toBe(0);
      expect(r.total).toBe(75000);
    });

    it('invoiceAmount must be >= baseAmount always', () => {
      [18, 12, 5, 0].forEach(rate => {
        const r = calcInvoiceTotals(100000, rate);
        expect(r.total).toBeGreaterThanOrEqual(r.base);
      });
    });
  });

  describe('Due date calculation', () => {
    it('NT30 → 30 days from posting', () => {
      expect(calcDueDate('2025-04-01', 'NT30')).toBe('2025-05-01');
    });

    it('NT45 → 45 days from posting', () => {
      expect(calcDueDate('2025-04-01', 'NT45')).toBe('2025-05-16');
    });

    it('NT60 → 60 days from posting', () => {
      expect(calcDueDate('2025-04-01', 'NT60')).toBe('2025-05-31');
    });

    it('unknown terms default to NT30', () => {
      expect(calcDueDate('2025-04-01', undefined)).toBe('2025-05-01');
    });

    it('due date is strictly after posting date', () => {
      const posting = '2025-04-01';
      const due = calcDueDate(posting, 'NT30');
      expect(new Date(due) > new Date(posting)).toBe(true);
    });
  });

  describe('Invoice status transitions', () => {
    it('PENDING can be approved', () => expect(canApproveInvoice('PENDING')).toBe(true));
    it('APPROVED cannot be re-approved', () => expect(canApproveInvoice('APPROVED')).toBe(false));
    it('PAID cannot be approved again', () => expect(canApproveInvoice('PAID')).toBe(false));
    it('BLOCKED cannot be approved directly', () => expect(canApproveInvoice('BLOCKED')).toBe(false));
    it('CANCELLED cannot be approved', () => expect(canApproveInvoice('CANCELLED')).toBe(false));

    it('PENDING can be blocked', () => expect(canBlockInvoice('PENDING')).toBe(true));
    it('APPROVED can be blocked (escalation)', () => expect(canBlockInvoice('APPROVED')).toBe(true));
    it('PAID cannot be blocked', () => expect(canBlockInvoice('PAID')).toBe(false));
  });

  describe('blockInvoice reason validation', () => {
    const validateReason = (r) => r && r.trim().length >= 5;
    it('valid reason accepted', () => expect(validateReason('Price mismatch on line 2')).toBe(true));
    it('too short reason rejected', () => expect(validateReason('GR')).toBe(false));
    it('empty string rejected', () => expect(validateReason('')).toBeFalsy());
    it('null reason rejected', () => expect(validateReason(null)).toBeFalsy());
    it('whitespace-only rejected', () => expect(validateReason('   ')).toBe(false));
  });

  describe('3-Way Match validation', () => {
    const po = { poNumber: 'PO0000001', vendorID: 'V001', totalValue: 855000 };
    const gr = { grNumber: 'GR0000001', totalValue: 855000 };

    it('perfect 3-way match passes all checks', () => {
      const inv = {
        vendorID: 'V001', baseAmount: '855000',
        poReference: 'PO0000001', grReference: 'GR0000001'
      };
      const result = threeWayMatchCheck(po, gr, inv);
      expect(result.allMatch).toBe(true);
      expect(result.vendorMatch).toBe(true);
      expect(result.qtyMatch).toBe(true);
      expect(result.poRefMatch).toBe(true);
      expect(result.grRefMatch).toBe(true);
    });

    it('vendor mismatch fails 3-way match', () => {
      const inv = { vendorID: 'V999', baseAmount: '855000',
        poReference: 'PO0000001', grReference: 'GR0000001' };
      const result = threeWayMatchCheck(po, gr, inv);
      expect(result.vendorMatch).toBe(false);
      expect(result.allMatch).toBe(false);
    });

    it('amount mismatch fails 3-way match', () => {
      const inv = { vendorID: 'V001', baseAmount: '900000', // different amount
        poReference: 'PO0000001', grReference: 'GR0000001' };
      const result = threeWayMatchCheck(po, gr, inv);
      expect(result.qtyMatch).toBe(false);
      expect(result.allMatch).toBe(false);
    });

    it('wrong PO reference fails match', () => {
      const inv = { vendorID: 'V001', baseAmount: '855000',
        poReference: 'PO9999999', grReference: 'GR0000001' };
      const result = threeWayMatchCheck(po, gr, inv);
      expect(result.poRefMatch).toBe(false);
    });
  });

  describe('Seed data integrity checks (pure logic)', () => {
    const seedInvoices = [
      { invoiceNo: 'INV-TS-00123', status: 'PAID',     invoiceAmount: 504450  },
      { invoiceNo: 'INV-TS-00131', status: 'PAID',     invoiceAmount: 504450  },
      { invoiceNo: 'INV-SKF-4521', status: 'PAID',     invoiceAmount: 57525   },
      { invoiceNo: 'INV-SE-20890', status: 'APPROVED', invoiceAmount: 150450  },
      { invoiceNo: 'INV-HV-7731',  status: 'PAID',     invoiceAmount: 42480   },
      { invoiceNo: 'INV-SE-21001', status: 'APPROVED', invoiceAmount: 460200  },
      { invoiceNo: 'INV-SE-21045', status: 'PENDING',  invoiceAmount: 460200  },
      { invoiceNo: 'INV-ML-3390',  status: 'PAID',     invoiceAmount: 88500   },
    ];

    it('seed has 8 invoices', () => expect(seedInvoices.length).toBe(8));

    it('all invoice amounts are positive', () => {
      seedInvoices.forEach(inv =>
        expect(inv.invoiceAmount).toBeGreaterThan(0)
      );
    });

    it('paid invoices count is correct', () => {
      const paid = seedInvoices.filter(i => i.status === 'PAID');
      expect(paid.length).toBe(5);
    });

    it('pending invoices count is correct', () => {
      const pending = seedInvoices.filter(i => i.status === 'PENDING');
      expect(pending.length).toBe(1);
    });

    it('approved invoices count is correct', () => {
      const approved = seedInvoices.filter(i => i.status === 'APPROVED');
      expect(approved.length).toBe(2); // wait for payment run
    });

    it('total invoiced value is correct', () => {
      const total = seedInvoices.reduce((s, i) => s + i.invoiceAmount, 0);
      expect(total).toBeCloseTo(2268255, 0);
    });
  });
});
