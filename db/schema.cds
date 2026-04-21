// ============================================================
// NovaBuild P2P Analytics — Core CDS Data Model
// File: db/schema.cds
// ============================================================

namespace novabuild.p2p;

using { managed, Currency, Country } from '@sap/cds/common';

// ─── MASTER DATA ─────────────────────────────────────────────

entity Vendors : managed {
  key vendorID      : String(10);
      name          : String(100) @mandatory;
      gstNumber     : String(15);
      panNumber     : String(10);
      country_code  : String(3);
      state         : String(50);
      city          : String(60);
      address       : String(255);
      pinCode       : String(10);
      email         : String(100);
      phone         : String(20);
      paymentTerms  : String(4) default 'NT30';
      bankAccount   : String(20);
      ifscCode      : String(11);
      isActive      : Boolean default true;
      creditLimit   : Decimal(15,2) default 0;
      currency_code : String(3) default 'INR';
      purchaseOrders : Association to many PurchaseOrders on purchaseOrders.vendor_vendorID = vendorID;
}

entity Materials : managed {
  key materialID      : String(18);
      description     : String(100) @mandatory;
      shortText       : String(40);
      materialGroup   : String(9);
      uom             : String(3) default 'EA';
      hsnCode         : String(8);
      gstRate         : Decimal(5,2) default 18.00;
      valuationClass  : String(4);
      standardPrice   : Decimal(15,2) default 0;
      movingAvgPrice  : Decimal(15,2) default 0;
      currency_code   : String(3) default 'INR';
      isActive        : Boolean default true;
      plant           : String(4);
      storageLocation : String(4);
}

// ─── PROCUREMENT DOCUMENTS ───────────────────────────────────

entity PurchaseRequisitions : managed {
  key prNumber      : String(10);
      title         : String(100);
      requestedBy   : String(12);
      requestedDate : Date;
      plant         : String(4) default 'NB10';
      costCenter    : String(10);
      wbsElement    : String(24);
      status        : String(20) default 'PENDING';
      totalValue    : Decimal(15,2) default 0;
      currency_code : String(3) default 'INR';
      remarks       : String(500);
      items         : Composition of many PRItems on items.pr_prNumber = prNumber;
}

entity PRItems : managed {
  key ID              : UUID;
      pr_prNumber     : String(10);
      lineNumber      : Integer;
      material_materialID : String(18);
      description     : String(100);
      quantity        : Decimal(13,3);
      uom             : String(3);
      unitPrice       : Decimal(15,2) default 0;
      totalPrice      : Decimal(15,2) default 0;
      deliveryDate    : Date;
      plant           : String(4);
}

entity PurchaseOrders : managed {
  key poNumber      : String(10);
      prReference   : String(10);
      vendor_vendorID : String(10);
      plant         : String(4) default 'NB10';
      purchOrg      : String(4) default 'NBPO';
      purchGroup    : String(3) default 'PG1';
      docDate       : Date;
      deliveryDate  : Date;
      paymentTerms  : String(4) default 'NT30';
      totalValue    : Decimal(15,2) default 0;
      taxAmount     : Decimal(15,2) default 0;
      currency_code : String(3) default 'INR';
      status        : String(20) default 'OPEN';
      remarks       : String(500);
      items         : Composition of many POItems on items.po_poNumber = poNumber;
}

entity POItems : managed {
  key ID                  : UUID;
      po_poNumber         : String(10);
      lineNumber          : Integer;
      material_materialID : String(18);
      description         : String(100);
      quantity            : Decimal(13,3);
      receivedQty         : Decimal(13,3) default 0;
      invoicedQty         : Decimal(13,3) default 0;
      uom                 : String(3);
      unitPrice           : Decimal(15,2);
      totalPrice          : Decimal(15,2) default 0;
      gstRate             : Decimal(5,2) default 18.00;
      taxAmount           : Decimal(15,2) default 0;
      deliveryDate        : Date;
      storageLocation     : String(4) default 'SL01';
}

entity GoodsReceipts : managed {
  key grNumber        : String(10);
      poReference     : String(10);
      vendor_vendorID : String(10);
      plant           : String(4);
      postingDate     : Date;
      documentDate    : Date;
      movementType    : String(3) default '101';
      totalValue      : Decimal(15,2) default 0;
      currency_code   : String(3) default 'INR';
      status          : String(10) default 'POSTED';
      deliveryNote    : String(16);
      remarks         : String(500);
      items           : Composition of many GRItems on items.gr_grNumber = grNumber;
}

entity GRItems : managed {
  key ID                  : UUID;
      gr_grNumber         : String(10);
      poItem_ID           : UUID;
      lineNumber          : Integer;
      material_materialID : String(18);
      description         : String(100);
      receivedQty         : Decimal(13,3);
      uom                 : String(3);
      unitPrice           : Decimal(15,2);
      totalValue          : Decimal(15,2) default 0;
      storageLocation     : String(4);
      batchNumber         : String(10);
}

entity InvoiceVerifications : managed {
  key invoiceNo       : String(16);
      vendor_vendorID : String(10);
      poReference     : String(10);
      grReference     : String(10);
      invoiceDate     : Date;
      postingDate     : Date;
      dueDate         : Date;
      baseAmount      : Decimal(15,2) default 0;
      taxAmount       : Decimal(15,2) default 0;
      invoiceAmount   : Decimal(15,2) default 0;
      currency_code   : String(3) default 'INR';
      status          : String(10) default 'PENDING';
      paymentRef      : String(16);
      remarks         : String(500);
      items           : Composition of many InvoiceItems on items.invoice_invoiceNo = invoiceNo;
}

entity InvoiceItems : managed {
  key ID                    : UUID;
      invoice_invoiceNo     : String(16);
      poItem_ID             : UUID;
      lineNumber            : Integer;
      material_materialID   : String(18);
      description           : String(100);
      quantity              : Decimal(13,3);
      uom                   : String(3);
      unitPrice             : Decimal(15,2);
      baseAmount            : Decimal(15,2) default 0;
      gstRate               : Decimal(5,2) default 18.00;
      taxAmount             : Decimal(15,2) default 0;
      totalAmount           : Decimal(15,2) default 0;
}

entity AuditLog : managed {
  key ID          : UUID;
      entityType  : String(30);
      entityID    : String(16);
      action      : String(50);
      oldStatus   : String(20);
      newStatus   : String(20);
      performedBy : String(60);
      remarks     : String(500);
      timestamp   : Timestamp;
}
