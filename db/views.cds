// ============================================================
// NovaBuild P2P Analytics — CDS Analytical Views
// File: db/views.cds
// ============================================================

namespace novabuild.p2p;

using { novabuild.p2p.PurchaseOrders }        from './schema';
using { novabuild.p2p.PurchaseRequisitions }  from './schema';
using { novabuild.p2p.GoodsReceipts }         from './schema';
using { novabuild.p2p.InvoiceVerifications }  from './schema';
using { novabuild.p2p.Vendors }               from './schema';

// ─── VIEW 1: P2P SUMMARY (join across P2P chain) ─────────────
@readonly
entity P2PSummaryView as select from PurchaseOrders {
  poNumber,
  prReference,
  vendor_vendorID  as vendorID,
  plant,
  purchGroup,
  docDate,
  deliveryDate,
  totalValue       as orderedAmount,
  taxAmount        as poTaxAmount,
  currency_code    as currency,
  status           as poStatus
};

// ─── VIEW 2: PR TRACKER ───────────────────────────────────────
@readonly
entity PRtoPoConversionView as select from PurchaseRequisitions {
  prNumber,
  requestedBy,
  plant,
  requestedDate,
  status        as prStatus,
  totalValue    as prValue,
  currency_code as currency,
  remarks
};

// ─── VIEW 3: OPEN PO TRACKER ─────────────────────────────────
@readonly
entity OpenPOTrackerView as select from PurchaseOrders {
  poNumber,
  vendor_vendorID as vendorID,
  plant,
  docDate,
  deliveryDate,
  totalValue,
  currency_code   as currency,
  status,
  remarks
} where status not in ('CLOSED', 'CANCELLED', 'INVOICED');

// ─── VIEW 4: GR SUMMARY ──────────────────────────────────────
@readonly
entity GRSummaryView as select from GoodsReceipts {
  grNumber,
  poReference,
  vendor_vendorID as vendorID,
  plant,
  postingDate,
  movementType,
  totalValue,
  currency_code   as currency,
  status,
  deliveryNote
};

// ─── VIEW 5: INVOICE TRACKER ─────────────────────────────────
@readonly
entity InvoiceTrackerView as select from InvoiceVerifications {
  invoiceNo,
  vendor_vendorID as vendorID,
  poReference,
  grReference,
  invoiceDate,
  postingDate,
  dueDate,
  baseAmount,
  taxAmount,
  invoiceAmount,
  currency_code   as currency,
  status
};

// ─── VIEW 6: VENDOR SUMMARY ───────────────────────────────────
@readonly
entity VendorSummaryView as select from Vendors {
  vendorID,
  name           as vendorName,
  country_code   as country,
  paymentTerms,
  isActive,
  creditLimit,
  currency_code  as currency
} where isActive = true;
