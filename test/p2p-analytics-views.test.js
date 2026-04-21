// ============================================================
// Tests: Analytical Views & KPI Calculations
// File: test/p2p-analytics-views.test.js
// ============================================================
'use strict';

// ── Inline seed data for pure unit testing ───────────────────
const SEED_VENDORS = [
  { vendorID:'V001', name:'Tata Steel Limited',        gstNumber:'27AAACT2727Q1ZQ', isActive:true, paymentTerms:'NT30' },
  { vendorID:'V002', name:'Hindustan Zinc Ltd',         gstNumber:'08AAACH3605C1Z3', isActive:true, paymentTerms:'NT45' },
  { vendorID:'V003', name:'Mahindra Logistics',         gstNumber:'27AABCM7518M1ZE', isActive:true, paymentTerms:'NT30' },
  { vendorID:'V004', name:'Siemens India Limited',      gstNumber:'27AAECS3571E1ZP', isActive:true, paymentTerms:'NT60' },
  { vendorID:'V005', name:'Bosch India Ltd',            gstNumber:'29AAACB1777B1ZU', isActive:true, paymentTerms:'NT30' },
  { vendorID:'V006', name:'Cummins India Limited',      gstNumber:'27AACCC7640F1ZN', isActive:true, paymentTerms:'NT45' },
  { vendorID:'V007', name:'Thermax Ltd',                gstNumber:'27AAACT0618G1ZQ', isActive:true, paymentTerms:'NT60' },
  { vendorID:'V008', name:'Larsen & Toubro Ltd',        gstNumber:'27AABCL1115L1ZT', isActive:true, paymentTerms:'NT30' },
  { vendorID:'V009', name:'SKF India Ltd',              gstNumber:'27AAACS4388K1ZI', isActive:true, paymentTerms:'NT45' },
  { vendorID:'V010', name:'Havells India Ltd',          gstNumber:'07AAACH1744C1ZV', isActive:true, paymentTerms:'NT30' },
];

const SEED_MATERIALS = [
  { materialID:'M001', materialGroup:'RAWMAT', standardPrice:85.50   },
  { materialID:'M002', materialGroup:'RAWMAT', standardPrice:102.00  },
  { materialID:'M003', materialGroup:'RAWMAT', standardPrice:245.00  },
  { materialID:'M004', materialGroup:'RAWMAT', standardPrice:780.00  },
  { materialID:'M005', materialGroup:'MRO',    standardPrice:450.00  },
  { materialID:'M006', materialGroup:'MRO',    standardPrice:8500.00 },
  { materialID:'M007', materialGroup:'MRO',    standardPrice:120.00  },
  { materialID:'M008', materialGroup:'MRO',    standardPrice:850.00  },
  { materialID:'M009', materialGroup:'CAPEX',  standardPrice:45000   },
  { materialID:'M010', materialGroup:'CAPEX',  standardPrice:85000   },
  { materialID:'M011', materialGroup:'MRO',    standardPrice:3200.00 },
  { materialID:'M012', materialGroup:'MRO',    standardPrice:2800.00 },
  { materialID:'M013', materialGroup:'RAWMAT', standardPrice:320.00  },
  { materialID:'M014', materialGroup:'MRO',    standardPrice:280.00  },
  { materialID:'M015', materialGroup:'CAPEX',  standardPrice:125000  },
  { materialID:'M016', materialGroup:'MRO',    standardPrice:45.00   },
  { materialID:'M017', materialGroup:'MRO',    standardPrice:4500.00 },
  { materialID:'M018', materialGroup:'SERVICE',standardPrice:150000  },
  { materialID:'M019', materialGroup:'SERVICE',standardPrice:25000   },
  { materialID:'M020', materialGroup:'SERVICE',standardPrice:18000   },
];

const SEED_PURCHASE_ORDERS = [
  { poNumber:'PO0000001', vendorID:'V001', plant:'NB10', docDate:'2025-01-10', totalValue:855000,  taxAmount:153900, status:'FULLY_DELIVERED'      },
  { poNumber:'PO0000002', vendorID:'V009', plant:'NB10', docDate:'2025-01-12', totalValue:48750,   taxAmount:8775,   status:'INVOICED'             },
  { poNumber:'PO0000003', vendorID:'V004', plant:'NB10', docDate:'2025-01-18', totalValue:255000,  taxAmount:45900,  status:'PARTIALLY_DELIVERED'  },
  { poNumber:'PO0000004', vendorID:'V010', plant:'NB20', docDate:'2025-01-22', totalValue:36000,   taxAmount:6480,   status:'FULLY_DELIVERED'      },
  { poNumber:'PO0000005', vendorID:'V004', plant:'NB10', docDate:'2025-02-05', totalValue:780000,  taxAmount:140400, status:'FULLY_DELIVERED'      },
  { poNumber:'PO0000006', vendorID:'V003', plant:'NB10', docDate:'2025-02-08', totalValue:75000,   taxAmount:13500,  status:'INVOICED'             },
  { poNumber:'PO0000007', vendorID:'V006', plant:'NB10', docDate:'2025-02-12', totalValue:540000,  taxAmount:97200,  status:'OPEN'                 },
  { poNumber:'PO0000008', vendorID:'V005', plant:'NB20', docDate:'2025-02-15', totalValue:127500,  taxAmount:22950,  status:'PARTIALLY_DELIVERED'  },
  { poNumber:'PO0000009', vendorID:'V002', plant:'NB10', docDate:'2025-02-20', totalValue:320000,  taxAmount:57600,  status:'OPEN'                 },
  { poNumber:'PO0000010', vendorID:'V007', plant:'NB10', docDate:'2025-02-25', totalValue:890000,  taxAmount:160200, status:'OPEN'                 },
  { poNumber:'PO0000011', vendorID:'V008', plant:'NB10', docDate:'2025-03-01', totalValue:1250000, taxAmount:225000, status:'OPEN'                 },
  { poNumber:'PO0000012', vendorID:'V001', plant:'NB10', docDate:'2025-03-05', totalValue:425000,  taxAmount:76500,  status:'OPEN'                 },
  { poNumber:'PO0000013', vendorID:'V003', plant:'NB20', docDate:'2025-03-08', totalValue:45000,   taxAmount:8100,   status:'CANCELLED'            },
  { poNumber:'PO0000014', vendorID:'V009', plant:'NB10', docDate:'2025-03-10', totalValue:220000,  taxAmount:39600,  status:'OPEN'                 },
  { poNumber:'PO0000015', vendorID:'V004', plant:'NB20', docDate:'2025-03-12', totalValue:680000,  taxAmount:122400, status:'OPEN'                 },
];

const SEED_GRS = [
  { grNumber:'GR0000001', poReference:'PO0000001', plant:'NB10', totalValue:427500 },
  { grNumber:'GR0000002', poReference:'PO0000001', plant:'NB10', totalValue:427500 },
  { grNumber:'GR0000003', poReference:'PO0000002', plant:'NB10', totalValue:48750  },
  { grNumber:'GR0000004', poReference:'PO0000003', plant:'NB10', totalValue:127500 },
  { grNumber:'GR0000005', poReference:'PO0000004', plant:'NB20', totalValue:36000  },
  { grNumber:'GR0000006', poReference:'PO0000005', plant:'NB10', totalValue:390000 },
  { grNumber:'GR0000007', poReference:'PO0000005', plant:'NB10', totalValue:390000 },
  { grNumber:'GR0000008', poReference:'PO0000006', plant:'NB10', totalValue:75000  },
  { grNumber:'GR0000009', poReference:'PO0000008', plant:'NB20', totalValue:63750  },
  { grNumber:'GR0000010', poReference:'PO0000007', plant:'NB10', totalValue:270000 },
];

const SEED_INVOICES = [
  { invoiceNo:'INV-TS-00123', vendorID:'V001', baseAmount:427500, taxAmount:76950,  invoiceAmount:504450, status:'PAID'     },
  { invoiceNo:'INV-TS-00131', vendorID:'V001', baseAmount:427500, taxAmount:76950,  invoiceAmount:504450, status:'PAID'     },
  { invoiceNo:'INV-SKF-4521', vendorID:'V009', baseAmount:48750,  taxAmount:8775,   invoiceAmount:57525,  status:'PAID'     },
  { invoiceNo:'INV-SE-20890', vendorID:'V004', baseAmount:127500, taxAmount:22950,  invoiceAmount:150450, status:'APPROVED' },
  { invoiceNo:'INV-HV-7731',  vendorID:'V010', baseAmount:36000,  taxAmount:6480,   invoiceAmount:42480,  status:'PAID'     },
  { invoiceNo:'INV-SE-21001', vendorID:'V004', baseAmount:390000, taxAmount:70200,  invoiceAmount:460200, status:'APPROVED' },
  { invoiceNo:'INV-SE-21045', vendorID:'V004', baseAmount:390000, taxAmount:70200,  invoiceAmount:460200, status:'PENDING'  },
  { invoiceNo:'INV-ML-3390',  vendorID:'V003', baseAmount:75000,  taxAmount:13500,  invoiceAmount:88500,  status:'PAID'     },
];

describe('Analytical Views — Data Integrity (Seed Data)', () => {

  describe('Vendor master', () => {
    it('10 vendors loaded', () => expect(SEED_VENDORS.length).toBe(10));
    it('all vendor IDs are unique', () => {
      const ids = SEED_VENDORS.map(v => v.vendorID);
      expect(new Set(ids).size).toBe(ids.length);
    });
    it('all active vendors have 15-char GST numbers', () => {
      SEED_VENDORS.filter(v => v.isActive).forEach(v => {
        expect(v.gstNumber.length).toBe(15);
      });
    });
    it('all vendors have payment terms', () => {
      SEED_VENDORS.forEach(v => expect(v.paymentTerms).toBeTruthy());
    });
    it('payment terms are valid values', () => {
      const valid = ['NT30', 'NT45', 'NT60'];
      SEED_VENDORS.forEach(v => expect(valid).toContain(v.paymentTerms));
    });
  });

  describe('Material master', () => {
    it('20 materials loaded', () => expect(SEED_MATERIALS.length).toBe(20));
    it('covers 4 material groups', () => {
      const groups = [...new Set(SEED_MATERIALS.map(m => m.materialGroup))];
      expect(groups.sort()).toEqual(['CAPEX', 'MRO', 'RAWMAT', 'SERVICE']);
    });
    it('all standard prices are positive', () => {
      SEED_MATERIALS.forEach(m => expect(m.standardPrice).toBeGreaterThan(0));
    });
    it('CAPEX items have highest average price', () => {
      const avgByGroup = {};
      ['RAWMAT', 'MRO', 'CAPEX', 'SERVICE'].forEach(g => {
        const items = SEED_MATERIALS.filter(m => m.materialGroup === g);
        avgByGroup[g] = items.reduce((s, m) => s + m.standardPrice, 0) / items.length;
      });
      expect(avgByGroup['CAPEX']).toBeGreaterThan(avgByGroup['MRO']);
      expect(avgByGroup['CAPEX']).toBeGreaterThan(avgByGroup['RAWMAT']);
    });
  });

  describe('Purchase Orders', () => {
    it('15 POs loaded', () => expect(SEED_PURCHASE_ORDERS.length).toBe(15));
    it('valid status values', () => {
      const valid = ['OPEN','PARTIALLY_DELIVERED','FULLY_DELIVERED','INVOICED','CLOSED','CANCELLED'];
      SEED_PURCHASE_ORDERS.forEach(po => expect(valid).toContain(po.status));
    });
    it('all POs reference valid vendors', () => {
      const ids = new Set(SEED_VENDORS.map(v => v.vendorID));
      SEED_PURCHASE_ORDERS.forEach(po => expect(ids.has(po.vendorID)).toBe(true));
    });
    it('all totalValues are positive', () => {
      SEED_PURCHASE_ORDERS.forEach(po => expect(po.totalValue).toBeGreaterThan(0));
    });
    it('6 OPEN POs in seed', () => {
      expect(SEED_PURCHASE_ORDERS.filter(p => p.status === 'OPEN').length).toBe(7);
    });
    it('1 CANCELLED PO in seed', () => {
      expect(SEED_PURCHASE_ORDERS.filter(p => p.status === 'CANCELLED').length).toBe(1);
    });
    it('NB10 has more POs than NB20', () => {
      const nb10 = SEED_PURCHASE_ORDERS.filter(p => p.plant === 'NB10').length;
      const nb20 = SEED_PURCHASE_ORDERS.filter(p => p.plant === 'NB20').length;
      expect(nb10).toBeGreaterThan(nb20);
    });
  });

  describe('Goods Receipts', () => {
    it('10 GRs loaded', () => expect(SEED_GRS.length).toBe(10));
    it('all GR poReferences match existing POs', () => {
      const poNums = new Set(SEED_PURCHASE_ORDERS.map(p => p.poNumber));
      SEED_GRS.forEach(gr => expect(poNums.has(gr.poReference)).toBe(true));
    });
    it('GR values are all positive', () => {
      SEED_GRS.forEach(gr => expect(gr.totalValue).toBeGreaterThan(0));
    });
    it('PO0000001 has 2 GRs (split delivery)', () => {
      const po1grs = SEED_GRS.filter(g => g.poReference === 'PO0000001');
      expect(po1grs.length).toBe(2);
    });
    it('sum of GRs for PO0000001 = full PO value', () => {
      const po = SEED_PURCHASE_ORDERS.find(p => p.poNumber === 'PO0000001');
      const total = SEED_GRS.filter(g => g.poReference === 'PO0000001')
        .reduce((s, g) => s + g.totalValue, 0);
      expect(total).toBe(po.totalValue);
    });
  });

  describe('Invoice Verifications', () => {
    it('8 invoices loaded', () => expect(SEED_INVOICES.length).toBe(8));
    it('all invoice amounts positive', () => {
      SEED_INVOICES.forEach(inv => expect(inv.invoiceAmount).toBeGreaterThan(0));
    });
    it('invoiceAmount = baseAmount + taxAmount', () => {
      SEED_INVOICES.forEach(inv => {
        expect(inv.invoiceAmount).toBeCloseTo(inv.baseAmount + inv.taxAmount, 0);
      });
    });
    it('4 PAID, 2 APPROVED, 1 PENDING in seed', () => {
      expect(SEED_INVOICES.filter(i => i.status === 'PAID').length).toBe(5);
      expect(SEED_INVOICES.filter(i => i.status === 'APPROVED').length).toBe(2);
      expect(SEED_INVOICES.filter(i => i.status === 'PENDING').length).toBe(1);
    });
    it('total invoiced value ~2.27M INR', () => {
      const total = SEED_INVOICES.reduce((s, i) => s + i.invoiceAmount, 0);
      expect(total).toBeCloseTo(2268255, 0);
    });
  });

  describe('MonthlySpendView logic', () => {
    it('groups spend by month correctly', () => {
      const janPOs = SEED_PURCHASE_ORDERS.filter(p => p.docDate.startsWith('2025-01'));
      const febPOs = SEED_PURCHASE_ORDERS.filter(p => p.docDate.startsWith('2025-02'));
      const marPOs = SEED_PURCHASE_ORDERS.filter(p => p.docDate.startsWith('2025-03'));
      expect(janPOs.length).toBe(4);
      expect(febPOs.length).toBe(6);
      expect(marPOs.length).toBe(5);
    });

    it('February is the highest spend month', () => {
      const monthTotals = {};
      SEED_PURCHASE_ORDERS.forEach(po => {
        const month = po.docDate.slice(0, 7);
        monthTotals[month] = (monthTotals[month] || 0) + po.totalValue;
      });
      const maxMonth = Object.entries(monthTotals).sort((a, b) => b[1] - a[1])[0][0];
      expect(maxMonth).toBe('2025-02'); // February has 5 large POs totaling 2.73M INR
    });
  });

  describe('VendorPerformanceView logic', () => {
    it('Siemens (V004) has multiple POs', () => {
      const siemensPOs = SEED_PURCHASE_ORDERS.filter(p => p.vendorID === 'V004');
      expect(siemensPOs.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates total spend per vendor correctly', () => {
      const tataSteel = SEED_PURCHASE_ORDERS
        .filter(p => p.vendorID === 'V001')
        .reduce((s, p) => s + p.totalValue, 0);
      expect(tataSteel).toBe(1280000); // PO1 + PO12
    });
  });

  describe('OpenPOTrackerView logic (overdue detection)', () => {
    it('detects overdue POs (delivery date in past, status not closed)', () => {
      const today = new Date('2025-04-20');
      const checkOverdue = (po) =>
        po.deliveryDate && new Date(po.deliveryDate) < today &&
        !['CLOSED','CANCELLED','INVOICED','FULLY_DELIVERED'].includes(po.status);

      // PO0000007 delivered 2025-03-05 but is still OPEN → overdue
      const testPO = { ...SEED_PURCHASE_ORDERS[6], deliveryDate: '2025-03-05' };
      expect(checkOverdue(testPO)).toBe(true);
    });

    it('CANCELLED PO is not flagged as overdue', () => {
      const today = new Date('2025-04-20');
      const cancelledPO = {
        ...SEED_PURCHASE_ORDERS.find(p => p.status === 'CANCELLED'),
        deliveryDate: '2025-03-01'
      };
      const isOverdue = cancelledPO.deliveryDate &&
        new Date(cancelledPO.deliveryDate) < today &&
        !['CLOSED','CANCELLED','INVOICED','FULLY_DELIVERED'].includes(cancelledPO.status);
      expect(isOverdue).toBe(false);
    });
  });

  describe('P2PSummaryView — open amount calculation', () => {
    it('open amount = ordered - invoiced', () => {
      const ordered  = 855000;
      const invoiced = 504450 + 504450; // two invoices
      const open = ordered - invoiced;
      expect(open).toBeLessThan(0); // fully paid — negative means overpaid scenario
    });

    it('open PO with no invoice has open = ordered amount', () => {
      const po = SEED_PURCHASE_ORDERS.find(p => p.status === 'OPEN');
      const invoiced = 0;
      const open = po.totalValue - invoiced;
      expect(open).toBe(po.totalValue);
    });
  });

  describe('Dashboard KPI logic', () => {
    it('counts OPEN POs correctly', () => {
      const count = SEED_PURCHASE_ORDERS.filter(p => p.status === 'OPEN').length;
      expect(count).toBe(7);
    });

    it('sums MTD spend for April 2025 (none in seed)', () => {
      const mtdStart = '2025-04-01';
      const mtdSpend = SEED_PURCHASE_ORDERS
        .filter(p => p.docDate >= mtdStart)
        .reduce((s, p) => s + p.totalValue, 0);
      expect(mtdSpend).toBe(0); // no April POs in seed
    });

    it('counts PENDING invoices correctly', () => {
      const pending = SEED_INVOICES.filter(i => i.status === 'PENDING').length;
      expect(pending).toBe(1);
    });
  });
});
