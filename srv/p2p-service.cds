// ============================================================
// NovaBuild P2P Analytics — OData V4 Service Definition
// File: srv/p2p-service.cds
// ============================================================

using { novabuild.p2p } from '../db/schema';
using { novabuild.p2p as views } from '../db/views';

@path: '/p2p'
@requires: 'authenticated-user'
service P2PAnalyticsService {

  // ── Master Data ───────────────────────────────────────────
  @readonly
  entity Vendors         as projection on p2p.Vendors
    excluding { bankAccount, ifscCode };

  @readonly
  entity Materials       as projection on p2p.Materials;

  // ── Purchase Requisitions ─────────────────────────────────
  entity PurchaseRequisitions as projection on p2p.PurchaseRequisitions
    actions {
      action approvePR(remarks : String) returns String;
      action rejectPR(reason   : String) returns String;
    };

  entity PRItems         as projection on p2p.PRItems;

  // ── Purchase Orders ───────────────────────────────────────
  @cds.redirection.target
  entity PurchaseOrders  as projection on p2p.PurchaseOrders
    actions {
      action cancelPO(reason : String) returns String;
    };

  entity POItems         as projection on p2p.POItems;

  // ── Goods Receipts (insert-only after posting) ────────────
  entity GoodsReceipts   as projection on p2p.GoodsReceipts;
  entity GRItems         as projection on p2p.GRItems;

  // ── Invoice Verification ──────────────────────────────────
  entity InvoiceVerifications as projection on p2p.InvoiceVerifications
    actions {
      action approveInvoice(remarks : String) returns String;
      action blockInvoice(reason    : String) returns String;
    };

  entity InvoiceItems    as projection on p2p.InvoiceItems;

  // ── Audit Log ─────────────────────────────────────────────
  @readonly
  entity AuditLog        as projection on p2p.AuditLog;

  // ── Analytical Views ──────────────────────────────────────
  @readonly
  entity P2PSummaryView        as projection on views.P2PSummaryView;

  @readonly
  entity PRtoPoConversionView  as projection on views.PRtoPoConversionView;

  @readonly
  entity OpenPOTrackerView     as projection on views.OpenPOTrackerView;

  @readonly
  entity GRSummaryView         as projection on views.GRSummaryView;

  @readonly
  entity InvoiceTrackerView    as projection on views.InvoiceTrackerView;

  @readonly
  entity VendorSummaryView     as projection on views.VendorSummaryView;

  // ── Unbound Functions ─────────────────────────────────────
  function getOpenPOs(plant : String, purchGroup : String) returns array of PurchaseOrders;
  function getDashboardKPIs()                               returns {
    totalOpenPOs      : Integer;
    totalPendingPRs   : Integer;
    totalSpendMTD     : Decimal;
    pendingInvoices   : Integer;
    overdueDeliveries : Integer;
  };
  function getApprovalQueue() returns array of PurchaseRequisitions;
}
