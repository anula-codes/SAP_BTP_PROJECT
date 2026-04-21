// ============================================================
// Tests: End-to-End P2P Flow (Pure Logic Simulation)
// File: test/p2p-integration.test.js
// ============================================================
'use strict';

// ── In-memory store simulating the CAP database ──────────────
class InMemoryStore {
  constructor() { this.tables = {}; }
  insert(table, record) {
    if (!this.tables[table]) this.tables[table] = [];
    this.tables[table].push({ ...record });
    return record;
  }
  findOne(table, predicate) {
    return (this.tables[table] || []).find(predicate) || null;
  }
  update(table, predicate, changes) {
    const idx = (this.tables[table] || []).findIndex(predicate);
    if (idx >= 0) Object.assign(this.tables[table][idx], changes);
    return idx >= 0;
  }
  find(table, predicate = () => true) {
    return (this.tables[table] || []).filter(predicate);
  }
  count(table, predicate = () => true) {
    return this.find(table, predicate).length;
  }
}

// ── Simulated service handlers ────────────────────────────────
class P2PService {
  constructor(db) { this.db = db; this.auditLog = []; }

  createPR(data) {
    const pr = { ...data, status: 'PENDING', prNumber: data.prNumber || `PR${Date.now()}` };
    this.db.insert('PurchaseRequisitions', pr);
    return pr;
  }

  approvePR(prNumber, user = 'system') {
    const pr = this.db.findOne('PurchaseRequisitions', r => r.prNumber === prNumber);
    if (!pr) throw new Error(`PR ${prNumber} not found`);
    if (pr.status === 'APPROVED') throw Object.assign(new Error('Already approved'), { status: 409 });
    if (pr.status === 'CANCELLED') throw Object.assign(new Error('Cannot approve cancelled PR'), { status: 409 });
    if (pr.status === 'CONVERTED') throw Object.assign(new Error('Already converted'), { status: 409 });
    this.db.update('PurchaseRequisitions', r => r.prNumber === prNumber, { status: 'APPROVED' });
    this._audit('PurchaseRequisition', prNumber, 'APPROVED', pr.status, 'APPROVED', user);
    return `PR ${prNumber} approved`;
  }

  rejectPR(prNumber, reason, user = 'system') {
    if (!reason || reason.trim().length < 5) throw Object.assign(new Error('Reason too short'), { status: 400 });
    const pr = this.db.findOne('PurchaseRequisitions', r => r.prNumber === prNumber);
    if (!pr) throw new Error(`PR ${prNumber} not found`);
    if (pr.status !== 'PENDING') throw Object.assign(new Error(`Only PENDING PRs can be rejected`), { status: 409 });
    this.db.update('PurchaseRequisitions', r => r.prNumber === prNumber, { status: 'REJECTED', remarks: reason });
    this._audit('PurchaseRequisition', prNumber, 'REJECTED', 'PENDING', 'REJECTED', user);
    return `PR ${prNumber} rejected`;
  }

  createPO(data) {
    const vendor = this.db.findOne('Vendors', v => v.vendorID === data.vendorID);
    if (!vendor) throw Object.assign(new Error(`Vendor ${data.vendorID} not found`), { status: 400 });
    if (!vendor.isActive) throw Object.assign(new Error(`Vendor ${data.vendorID} is inactive`), { status: 400 });
    const po = { ...data, status: 'OPEN', poNumber: data.poNumber || `PO${Date.now()}`,
                 paymentTerms: data.paymentTerms || vendor.paymentTerms };
    this.db.insert('PurchaseOrders', po);
    if (data.prReference) {
      this.db.update('PurchaseRequisitions', r => r.prNumber === data.prReference, { status: 'CONVERTED' });
    }
    return po;
  }

  postGR(data) {
    const po = this.db.findOne('PurchaseOrders', p => p.poNumber === data.poReference);
    if (!po) throw Object.assign(new Error(`PO ${data.poReference} not found`), { status: 400 });
    if (['CANCELLED','CLOSED'].includes(po.status)) {
      throw Object.assign(new Error(`Cannot post GR against ${po.status} PO`), { status: 400 });
    }
    const gr = { ...data, status: 'POSTED', grNumber: data.grNumber || `GR${Date.now()}` };
    this.db.insert('GoodsReceipts', gr);
    this.db.update('PurchaseOrders', p => p.poNumber === data.poReference, { status: 'FULLY_DELIVERED' });
    return gr;
  }

  approveInvoice(invoiceNo, user = 'system') {
    const inv = this.db.findOne('InvoiceVerifications', i => i.invoiceNo === invoiceNo);
    if (!inv) throw new Error(`Invoice ${invoiceNo} not found`);
    if (inv.status !== 'PENDING') throw Object.assign(new Error('Not in PENDING status'), { status: 409 });
    this.db.update('InvoiceVerifications', i => i.invoiceNo === invoiceNo, { status: 'APPROVED' });
    if (inv.poReference) {
      this.db.update('PurchaseOrders', p => p.poNumber === inv.poReference, { status: 'INVOICED' });
    }
    this._audit('InvoiceVerification', invoiceNo, 'INVOICE_APPROVED', 'PENDING', 'APPROVED', user);
    return `Invoice ${invoiceNo} approved`;
  }

  blockInvoice(invoiceNo, reason, user = 'system') {
    if (!reason || reason.trim().length < 5) throw Object.assign(new Error('Reason too short'), { status: 400 });
    const inv = this.db.findOne('InvoiceVerifications', i => i.invoiceNo === invoiceNo);
    if (!inv) throw new Error(`Invoice ${invoiceNo} not found`);
    this.db.update('InvoiceVerifications', i => i.invoiceNo === invoiceNo, { status: 'BLOCKED', remarks: reason });
    return `Invoice ${invoiceNo} blocked`;
  }

  _audit(entityType, entityID, action, oldStatus, newStatus, user) {
    this.auditLog.push({ entityType, entityID, action, oldStatus, newStatus, performedBy: user, timestamp: new Date() });
  }

  getDashboardKPIs() {
    const pos = this.db.find('PurchaseOrders');
    const prs = this.db.find('PurchaseRequisitions');
    const invs = this.db.find('InvoiceVerifications');
    return {
      totalOpenPOs:     this.db.count('PurchaseOrders', p => p.status === 'OPEN'),
      totalPendingPRs:  this.db.count('PurchaseRequisitions', r => r.status === 'PENDING'),
      pendingInvoices:  this.db.count('InvoiceVerifications', i => i.status === 'PENDING'),
      totalSpendMTD:    pos.reduce((s, p) => s + (p.totalValue || 0), 0),
      overdueDeliveries: 0
    };
  }
}

// ─────────────────────────────────────────────────────────────
describe('P2P End-to-End Integration Flow', () => {
  let db, svc;

  beforeEach(() => {
    db = new InMemoryStore();
    svc = new P2PService(db);
    // Seed vendor
    db.insert('Vendors', { vendorID: 'V001', name: 'Tata Steel', isActive: true, paymentTerms: 'NT30' });
    db.insert('Vendors', { vendorID: 'V999', name: 'Inactive Vendor', isActive: false, paymentTerms: 'NT30' });
  });

  describe('STEP 1 — Create Purchase Requisition', () => {
    it('creates PR with PENDING status', () => {
      const pr = svc.createPR({ prNumber: 'PR001', title: 'Steel Q2', plant: 'NB10', requestedBy: 'EMP001' });
      expect(pr.status).toBe('PENDING');
      expect(pr.prNumber).toBe('PR001');
    });

    it('auto-generates PR number if not provided', () => {
      const pr = svc.createPR({ title: 'Auto-numbered PR' });
      expect(pr.prNumber).toBeTruthy();
    });
  });

  describe('STEP 2 — Approve Purchase Requisition', () => {
    beforeEach(() => {
      svc.createPR({ prNumber: 'PR002', status: 'PENDING' });
    });

    it('approves a PENDING PR successfully', () => {
      const result = svc.approvePR('PR002', 'alice');
      expect(result).toContain('approved');
      const pr = db.findOne('PurchaseRequisitions', r => r.prNumber === 'PR002');
      expect(pr.status).toBe('APPROVED');
    });

    it('writes audit log entry on approval', () => {
      svc.approvePR('PR002', 'alice');
      expect(svc.auditLog).toHaveLength(1);
      expect(svc.auditLog[0].action).toBe('APPROVED');
      expect(svc.auditLog[0].performedBy).toBe('alice');
    });

    it('throws 409 on re-approval', () => {
      svc.approvePR('PR002', 'alice');
      expect(() => svc.approvePR('PR002', 'alice')).toThrow('Already approved');
    });
  });

  describe('STEP 2b — Reject Purchase Requisition', () => {
    beforeEach(() => { svc.createPR({ prNumber: 'PR003' }); });

    it('rejects PENDING PR with valid reason', () => {
      svc.rejectPR('PR003', 'Budget not allocated for this quarter', 'alice');
      const pr = db.findOne('PurchaseRequisitions', r => r.prNumber === 'PR003');
      expect(pr.status).toBe('REJECTED');
      expect(pr.remarks).toBeTruthy();
    });

    it('throws 400 for short rejection reason', () => {
      expect(() => svc.rejectPR('PR003', 'No', 'alice')).toThrow('Reason too short');
    });

    it('throws 409 rejecting non-PENDING PR', () => {
      svc.approvePR('PR003', 'alice');
      expect(() => svc.rejectPR('PR003', 'Changed my mind', 'alice')).toThrow();
    });
  });

  describe('STEP 3 — Create Purchase Order', () => {
    beforeEach(() => {
      svc.createPR({ prNumber: 'PR004' });
      svc.approvePR('PR004', 'alice');
    });

    it('creates PO and converts PR', () => {
      const po = svc.createPO({ poNumber: 'PO001', vendorID: 'V001', prReference: 'PR004', totalValue: 855000 });
      expect(po.status).toBe('OPEN');
      const pr = db.findOne('PurchaseRequisitions', r => r.prNumber === 'PR004');
      expect(pr.status).toBe('CONVERTED');
    });

    it('inherits payment terms from vendor', () => {
      const po = svc.createPO({ poNumber: 'PO002', vendorID: 'V001', totalValue: 100000 });
      expect(po.paymentTerms).toBe('NT30');
    });

    it('throws 400 for non-existent vendor', () => {
      expect(() => svc.createPO({ vendorID: 'V888', totalValue: 1000 })).toThrow('not found');
    });

    it('throws 400 for inactive vendor', () => {
      expect(() => svc.createPO({ vendorID: 'V999', totalValue: 1000 })).toThrow('inactive');
    });
  });

  describe('STEP 4 — Post Goods Receipt', () => {
    beforeEach(() => {
      svc.createPO({ poNumber: 'PO010', vendorID: 'V001', totalValue: 500000 });
    });

    it('posts GR and sets POSTED status', () => {
      const gr = svc.postGR({ grNumber: 'GR010', poReference: 'PO010', totalValue: 500000, movementType: '101' });
      expect(gr.status).toBe('POSTED');
    });

    it('updates PO to FULLY_DELIVERED after GR', () => {
      svc.postGR({ grNumber: 'GR011', poReference: 'PO010', totalValue: 500000 });
      const po = db.findOne('PurchaseOrders', p => p.poNumber === 'PO010');
      expect(po.status).toBe('FULLY_DELIVERED');
    });

    it('throws 400 posting GR against CANCELLED PO', () => {
      db.update('PurchaseOrders', p => p.poNumber === 'PO010', { status: 'CANCELLED' });
      expect(() => svc.postGR({ poReference: 'PO010', totalValue: 100 })).toThrow('CANCELLED');
    });

    it('throws 400 posting GR against non-existent PO', () => {
      expect(() => svc.postGR({ poReference: 'PO999', totalValue: 100 })).toThrow('not found');
    });
  });

  describe('STEP 5 — Invoice Approval', () => {
    beforeEach(() => {
      db.insert('InvoiceVerifications', { invoiceNo: 'INV001', status: 'PENDING', poReference: 'PO010', baseAmount: 500000 });
      svc.createPO({ poNumber: 'PO010', vendorID: 'V001', totalValue: 500000 });
    });

    it('approves PENDING invoice', () => {
      svc.approveInvoice('INV001', 'alice');
      const inv = db.findOne('InvoiceVerifications', i => i.invoiceNo === 'INV001');
      expect(inv.status).toBe('APPROVED');
    });

    it('throws 409 approving non-PENDING invoice', () => {
      svc.approveInvoice('INV001', 'alice');
      expect(() => svc.approveInvoice('INV001', 'alice')).toThrow();
    });

    it('updates PO status to INVOICED on approval', () => {
      svc.approveInvoice('INV001', 'alice');
      const po = db.findOne('PurchaseOrders', p => p.poNumber === 'PO010');
      expect(po.status).toBe('INVOICED');
    });
  });

  describe('STEP 5b — Invoice Blocking', () => {
    beforeEach(() => {
      db.insert('InvoiceVerifications', { invoiceNo: 'INV002', status: 'PENDING', baseAmount: 100000 });
    });

    it('blocks invoice with valid reason', () => {
      svc.blockInvoice('INV002', 'Price mismatch — PO says 100 units, invoice says 120', 'alice');
      const inv = db.findOne('InvoiceVerifications', i => i.invoiceNo === 'INV002');
      expect(inv.status).toBe('BLOCKED');
    });

    it('throws 400 with short reason', () => {
      expect(() => svc.blockInvoice('INV002', 'bad', 'alice')).toThrow('Reason too short');
    });
  });

  describe('STEP 6 — Full P2P Cycle Audit', () => {
    it('complete flow: PR → PO → GR → Invoice → Approved', () => {
      // Create and approve PR
      svc.createPR({ prNumber: 'PR_FULL', title: 'Full E2E Test' });
      svc.approvePR('PR_FULL', 'alice');

      // Create PO
      svc.createPO({ poNumber: 'PO_FULL', vendorID: 'V001', prReference: 'PR_FULL', totalValue: 200000 });

      // Post GR
      svc.postGR({ grNumber: 'GR_FULL', poReference: 'PO_FULL', totalValue: 200000 });

      // Create and approve invoice
      db.insert('InvoiceVerifications', { invoiceNo: 'INV_FULL', status: 'PENDING', poReference: 'PO_FULL', baseAmount: 200000 });
      svc.approveInvoice('INV_FULL', 'alice');

      // Verify full chain
      const pr  = db.findOne('PurchaseRequisitions', r => r.prNumber === 'PR_FULL');
      const po  = db.findOne('PurchaseOrders',       p => p.poNumber === 'PO_FULL');
      const gr  = db.findOne('GoodsReceipts',         g => g.grNumber === 'GR_FULL');
      const inv = db.findOne('InvoiceVerifications',  i => i.invoiceNo === 'INV_FULL');

      expect(pr.status).toBe('CONVERTED');
      expect(po.status).toBe('INVOICED');
      expect(gr.status).toBe('POSTED');
      expect(inv.status).toBe('APPROVED');
    });

    it('audit log captures all state changes', () => {
      svc.createPR({ prNumber: 'PR_AUDIT' });
      svc.approvePR('PR_AUDIT', 'alice');
      db.insert('InvoiceVerifications', { invoiceNo: 'INV_AUDIT', status: 'PENDING', baseAmount: 50000 });
      svc.approveInvoice('INV_AUDIT', 'alice');

      expect(svc.auditLog.length).toBeGreaterThanOrEqual(2);
      const actions = svc.auditLog.map(e => e.action);
      expect(actions).toContain('APPROVED');
      expect(actions).toContain('INVOICE_APPROVED');
    });
  });

  describe('Dashboard KPIs', () => {
    it('returns correct counts from in-memory data', () => {
      svc.createPR({ prNumber: 'PR_KPI1' });
      svc.createPR({ prNumber: 'PR_KPI2' });
      svc.createPO({ poNumber: 'PO_KPI1', vendorID: 'V001', totalValue: 100000 });
      svc.createPO({ poNumber: 'PO_KPI2', vendorID: 'V001', totalValue: 200000 });

      const kpis = svc.getDashboardKPIs();
      expect(kpis.totalOpenPOs).toBe(2);
      expect(kpis.totalPendingPRs).toBe(2);
      expect(kpis.totalSpendMTD).toBe(300000);
    });
  });
});
