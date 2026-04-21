// ============================================================
// NovaBuild P2P Analytics — Service Implementation
// File: srv/p2p-service.js
// ============================================================

'use strict';

const cds = require('@sap/cds');
const LOG = cds.log('p2p-service');

// ─── Utilities ───────────────────────────────────────────────
function generateDocNumber(prefix, length = 10) {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}${ts}${rand}`.slice(0, length);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getPaymentDays(terms) {
  if (terms === 'NT60') return 60;
  if (terms === 'NT45') return 45;
  return 30;
}

// ─── Service Handler ─────────────────────────────────────────
module.exports = class P2PAnalyticsService extends cds.ApplicationService {

  async init() {
    const {
      PurchaseRequisitions,
      PRItems,
      PurchaseOrders,
      POItems,
      GoodsReceipts,
      GRItems,
      InvoiceVerifications,
      AuditLog
    } = this.entities;

    // ════════════════════════════════════════════════════════
    // PURCHASE REQUISITIONS
    // ════════════════════════════════════════════════════════

    this.before('CREATE', PurchaseRequisitions, async (req) => {
      const pr = req.data;
      if (!pr.prNumber) pr.prNumber = generateDocNumber('PR', 10);
      pr.status       = 'PENDING';
      pr.requestedDate = pr.requestedDate || today();
      LOG.info(`Creating PR: ${pr.prNumber} by ${pr.requestedBy}`);
    });

    this.after('CREATE', PRItems, async (result) => {
      if (result.quantity && result.unitPrice) {
        const total = parseFloat(result.quantity) * parseFloat(result.unitPrice);
        await UPDATE(PRItems).set({ totalPrice: total }).where({ ID: result.ID });
      }
    });

    // ── approvePR action ─────────────────────────────────────
    this.on('approvePR', PurchaseRequisitions, async (req) => {
      const { ID } = req.params[0];
      const { remarks } = req.data;

      const pr = await SELECT.one.from(PurchaseRequisitions).where({ ID });
      if (!pr)                      return req.error(404, `PR ${ID} not found`);
      if (pr.status === 'APPROVED') return req.error(409, `PR ${pr.prNumber} is already approved`);
      if (pr.status === 'CANCELLED') return req.error(409, `PR ${pr.prNumber} is cancelled`);
      if (pr.status === 'CONVERTED') return req.error(409, `PR ${pr.prNumber} already converted to PO`);

      await UPDATE(PurchaseRequisitions).set({ status: 'APPROVED' }).where({ ID });

      await this._auditLog('PurchaseRequisition', pr.prNumber, 'APPROVED',
        pr.status, 'APPROVED', req.user?.id || 'SYSTEM', remarks || 'Approved');

      LOG.info(`PR ${pr.prNumber} approved by ${req.user?.id}`);
      return `PR ${pr.prNumber} successfully approved`;
    });

    // ── rejectPR action ──────────────────────────────────────
    this.on('rejectPR', PurchaseRequisitions, async (req) => {
      const { ID } = req.params[0];
      const { reason } = req.data;

      if (!reason || reason.trim().length < 5) {
        return req.error(400, 'Rejection reason must be at least 5 characters');
      }
      const pr = await SELECT.one.from(PurchaseRequisitions).where({ ID });
      if (!pr)                     return req.error(404, `PR ${ID} not found`);
      if (pr.status !== 'PENDING') return req.error(409, `Only PENDING PRs can be rejected. Current: ${pr.status}`);

      await UPDATE(PurchaseRequisitions).set({ status: 'REJECTED', remarks: reason }).where({ ID });
      await this._auditLog('PurchaseRequisition', pr.prNumber, 'REJECTED',
        'PENDING', 'REJECTED', req.user?.id || 'SYSTEM', reason);

      return `PR ${pr.prNumber} rejected`;
    });

    // ════════════════════════════════════════════════════════
    // PURCHASE ORDERS
    // ════════════════════════════════════════════════════════

    this.before('CREATE', PurchaseOrders, async (req) => {
      const po = req.data;
      if (!po.poNumber) po.poNumber = generateDocNumber('PO', 10);

      // Validate vendor
      if (po.vendor_vendorID) {
        const vendor = await SELECT.one.from('novabuild.p2p.Vendors')
          .where({ vendorID: po.vendor_vendorID });
        if (!vendor)          return req.error(400, `Vendor ${po.vendor_vendorID} does not exist`);
        if (!vendor.isActive) return req.error(400, `Vendor ${po.vendor_vendorID} is inactive`);
        if (!po.paymentTerms) po.paymentTerms = vendor.paymentTerms;
      }

      po.status  = po.status || 'OPEN';
      po.docDate = po.docDate || today();

      // Mark linked PR as CONVERTED
      if (po.prReference) {
        await UPDATE(PurchaseRequisitions)
          .set({ status: 'CONVERTED' })
          .where({ prNumber: po.prReference });
      }

      LOG.info(`Creating PO: ${po.poNumber} for vendor ${po.vendor_vendorID}`);
    });

    this.after('CREATE', POItems, async (result) => {
      if (result.quantity && result.unitPrice) {
        const base  = parseFloat(result.quantity) * parseFloat(result.unitPrice);
        const tax   = base * (parseFloat(result.gstRate || 18) / 100);
        await UPDATE(POItems).set({ totalPrice: base, taxAmount: tax }).where({ ID: result.ID });

        // Refresh PO header totals
        const allItems = await SELECT.from(POItems).where({ po_poNumber: result.po_poNumber });
        const totalValue = allItems.reduce((s, i) => s + parseFloat(i.totalPrice || 0), 0);
        const taxAmount  = allItems.reduce((s, i) => s + parseFloat(i.taxAmount  || 0), 0);
        await UPDATE(PurchaseOrders).set({ totalValue, taxAmount }).where({ poNumber: result.po_poNumber });
      }
    });

    // ── cancelPO action ──────────────────────────────────────
    this.on('cancelPO', PurchaseOrders, async (req) => {
      const { ID } = req.params[0];
      const { reason } = req.data;

      const po = await SELECT.one.from(PurchaseOrders).where({ ID });
      if (!po) return req.error(404, `PO ${ID} not found`);
      if (['CLOSED', 'CANCELLED', 'FULLY_DELIVERED'].includes(po.status)) {
        return req.error(409, `PO ${po.poNumber} cannot be cancelled. Status: ${po.status}`);
      }

      await UPDATE(PurchaseOrders).set({ status: 'CANCELLED', remarks: reason }).where({ ID });
      await this._auditLog('PurchaseOrder', po.poNumber, 'CANCELLED',
        po.status, 'CANCELLED', req.user?.id || 'SYSTEM', reason);

      return `PO ${po.poNumber} cancelled`;
    });

    // ════════════════════════════════════════════════════════
    // GOODS RECEIPTS
    // ════════════════════════════════════════════════════════

    this.before('CREATE', GoodsReceipts, async (req) => {
      const gr = req.data;
      if (!gr.grNumber) gr.grNumber = generateDocNumber('GR', 10);
      gr.postingDate = gr.postingDate || today();
      gr.status      = 'POSTED';

      if (gr.poReference) {
        const po = await SELECT.one.from(PurchaseOrders).where({ poNumber: gr.poReference });
        if (!po) return req.error(400, `PO ${gr.poReference} does not exist`);
        if (['CANCELLED', 'CLOSED'].includes(po.status)) {
          return req.error(400, `Cannot post GR against ${po.status} PO ${gr.poReference}`);
        }
      }

      LOG.info(`Posting GR: ${gr.grNumber} against PO ${gr.poReference}`);
    });

    this.after('CREATE', GoodsReceipts, async (result) => {
      if (!result.poReference) return;
      await this._refreshPOStatus(result.poReference);
    });

    // ════════════════════════════════════════════════════════
    // INVOICE VERIFICATION
    // ════════════════════════════════════════════════════════

    this.before('CREATE', InvoiceVerifications, async (req) => {
      const inv = req.data;
      if (!inv.invoiceNo) inv.invoiceNo = generateDocNumber('INV', 16);
      inv.postingDate = inv.postingDate || today();
      inv.status      = 'PENDING';

      // Calculate due date from vendor payment terms
      if (inv.vendor_vendorID) {
        const vendor = await SELECT.one.from('novabuild.p2p.Vendors')
          .where({ vendorID: inv.vendor_vendorID });
        if (vendor && !inv.dueDate) {
          const days = getPaymentDays(vendor.paymentTerms);
          const due  = new Date();
          due.setDate(due.getDate() + days);
          inv.dueDate = due.toISOString().slice(0, 10);
        }
      }

      // Auto-calculate tax if only base given
      if (!inv.invoiceAmount && inv.baseAmount) {
        const tax = parseFloat(inv.baseAmount) * 0.18;
        inv.taxAmount     = parseFloat(tax.toFixed(2));
        inv.invoiceAmount = parseFloat((parseFloat(inv.baseAmount) + tax).toFixed(2));
      }
    });

    // ── approveInvoice action ────────────────────────────────
    this.on('approveInvoice', InvoiceVerifications, async (req) => {
      const { ID } = req.params[0];
      const { remarks } = req.data;

      const inv = await SELECT.one.from(InvoiceVerifications).where({ ID });
      if (!inv) return req.error(404, `Invoice ${ID} not found`);
      if (inv.status !== 'PENDING') {
        return req.error(409, `Invoice ${inv.invoiceNo} is not PENDING (current: ${inv.status})`);
      }

      await UPDATE(InvoiceVerifications).set({ status: 'APPROVED' }).where({ ID });
      await this._auditLog('InvoiceVerification', inv.invoiceNo, 'INVOICE_APPROVED',
        'PENDING', 'APPROVED', req.user?.id || 'SYSTEM', remarks || 'Approved');

      if (inv.poReference) {
        await UPDATE(PurchaseOrders).set({ status: 'INVOICED' }).where({ poNumber: inv.poReference });
      }

      return `Invoice ${inv.invoiceNo} approved`;
    });

    // ── blockInvoice action ──────────────────────────────────
    this.on('blockInvoice', InvoiceVerifications, async (req) => {
      const { ID } = req.params[0];
      const { reason } = req.data;

      if (!reason || reason.trim().length < 5) {
        return req.error(400, 'Block reason must be at least 5 characters');
      }
      const inv = await SELECT.one.from(InvoiceVerifications).where({ ID });
      if (!inv) return req.error(404, `Invoice ${ID} not found`);

      await UPDATE(InvoiceVerifications).set({ status: 'BLOCKED', remarks: reason }).where({ ID });
      await this._auditLog('InvoiceVerification', inv.invoiceNo, 'INVOICE_BLOCKED',
        inv.status, 'BLOCKED', req.user?.id || 'SYSTEM', reason);

      return `Invoice ${inv.invoiceNo} blocked`;
    });

    // ════════════════════════════════════════════════════════
    // CUSTOM FUNCTIONS
    // ════════════════════════════════════════════════════════

    this.on('getOpenPOs', async (req) => {
      const { plant, purchGroup } = req.data;
      const cond = { status: 'OPEN' };
      if (plant)      cond.plant      = plant;
      if (purchGroup) cond.purchGroup = purchGroup;
      const result = await SELECT.from(PurchaseOrders).where(cond).orderBy('docDate desc');
      LOG.info(`getOpenPOs: plant=${plant}, purchGroup=${purchGroup}, count=${result.length}`);
      return result;
    });

    this.on('getDashboardKPIs', async () => {
      const [openPOs]      = await SELECT`count(*) as cnt`.from(PurchaseOrders).where({ status: 'OPEN' });
      const [pendingPRs]   = await SELECT`count(*) as cnt`.from(PurchaseRequisitions).where({ status: 'PENDING' });
      const [pendingInvs]  = await SELECT`count(*) as cnt`.from(InvoiceVerifications).where({ status: 'PENDING' });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().slice(0, 10);
      const mtdPOs   = await SELECT.from(PurchaseOrders).where(`docDate >= '${startStr}'`);
      const mtdSpend = mtdPOs.reduce((s, p) => s + parseFloat(p.totalValue || 0), 0);

      const todayStr  = today();
      const overduePOs = await SELECT.from(PurchaseOrders)
        .where(`deliveryDate < '${todayStr}' and status not in ('CLOSED','CANCELLED','INVOICED','FULLY_DELIVERED')`);

      return {
        totalOpenPOs:      parseInt(openPOs.cnt      || 0),
        totalPendingPRs:   parseInt(pendingPRs.cnt   || 0),
        totalSpendMTD:     parseFloat(mtdSpend.toFixed(2)),
        pendingInvoices:   parseInt(pendingInvs.cnt  || 0),
        overdueDeliveries: overduePOs.length
      };
    });

    this.on('getApprovalQueue', async () => {
      return SELECT.from(PurchaseRequisitions)
        .where({ status: 'PENDING' })
        .orderBy('requestedDate asc');
    });

    await super.init();
  }

  // ─── Private Helpers ─────────────────────────────────────
  async _auditLog(entityType, entityID, action, oldStatus, newStatus, performedBy, remarks) {
    try {
      const { AuditLog } = this.entities;
      await INSERT.into(AuditLog).entries({
        entityType,
        entityID,
        action,
        oldStatus,
        newStatus,
        performedBy,
        remarks,
        timestamp: new Date()
      });
    } catch (e) {
      cds.log('p2p-audit').warn(`Audit log failed for ${entityID}: ${e.message}`);
    }
  }

  async _refreshPOStatus(poNumber) {
    const { PurchaseOrders, POItems } = this.entities;
    const items = await SELECT.from(POItems).where({ po_poNumber: poNumber });
    if (!items.length) return;

    const allDelivered = items.every(i => parseFloat(i.receivedQty || 0) >= parseFloat(i.quantity || 0));
    const anyDelivered = items.some(i => parseFloat(i.receivedQty || 0) > 0);

    let newStatus;
    if (allDelivered) newStatus = 'FULLY_DELIVERED';
    else if (anyDelivered) newStatus = 'PARTIALLY_DELIVERED';
    else return;

    await UPDATE(PurchaseOrders).set({ status: newStatus }).where({ poNumber });
    LOG.info(`PO ${poNumber} status → ${newStatus}`);
  }
};
