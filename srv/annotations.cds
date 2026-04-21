// ============================================================
// NovaBuild P2P Analytics — Fiori UI Annotations
// File: srv/annotations.cds
// ============================================================

using P2PAnalyticsService as service from './p2p-service';

// ─── PURCHASE ORDERS ─────────────────────────────────────────
annotate service.PurchaseOrders with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Purchase Order',
      TypeNamePlural: 'Purchase Orders',
      Title: { Value: poNumber },
      Description: { Value: vendor_vendorID }
    },
    SelectionFields: [ poNumber, vendor_vendorID, plant, status, docDate ],
    LineItem: [
      { Value: poNumber,       Label: 'PO Number' },
      { Value: vendor_vendorID, Label: 'Vendor' },
      { Value: plant,          Label: 'Plant' },
      { Value: purchGroup,     Label: 'Purch. Group' },
      { Value: docDate,        Label: 'Doc Date' },
      { Value: deliveryDate,   Label: 'Delivery Date' },
      { Value: totalValue,     Label: 'Order Value' },
      { Value: currency_code,  Label: 'Currency' },
      { Value: status,         Label: 'Status' }
    ],
    Facets: [
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'General Information',
        Target: '@UI.FieldGroup#General'
      },
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'Line Items',
        Target: 'items/@UI.LineItem'
      }
    ],
    FieldGroup#General: {
      Label: 'General Information',
      Data: [
        { Value: poNumber },
        { Value: prReference,    Label: 'PR Reference' },
        { Value: vendor_vendorID, Label: 'Vendor ID' },
        { Value: plant,          Label: 'Plant' },
        { Value: purchOrg,       Label: 'Purch. Org.' },
        { Value: purchGroup,     Label: 'Purch. Group' },
        { Value: paymentTerms,   Label: 'Payment Terms' },
        { Value: totalValue,     Label: 'Net Value' },
        { Value: taxAmount,      Label: 'Tax Amount' },
        { Value: status,         Label: 'Status' },
        { Value: remarks,        Label: 'Remarks' }
      ]
    }
  }
);

// ─── PO ITEMS ─────────────────────────────────────────────────
annotate service.POItems with @(
  UI: {
    LineItem: [
      { Value: lineNumber,          Label: 'Line' },
      { Value: material_materialID, Label: 'Material' },
      { Value: description,         Label: 'Description' },
      { Value: quantity,            Label: 'Qty' },
      { Value: uom,                 Label: 'UoM' },
      { Value: unitPrice,           Label: 'Unit Price' },
      { Value: gstRate,             Label: 'GST %' },
      { Value: totalPrice,          Label: 'Net Value' },
      { Value: receivedQty,         Label: 'Received Qty' }
    ]
  }
);

// ─── PURCHASE REQUISITIONS ────────────────────────────────────
annotate service.PurchaseRequisitions with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Purchase Requisition',
      TypeNamePlural: 'Purchase Requisitions',
      Title: { Value: prNumber },
      Description: { Value: title }
    },
    SelectionFields: [ prNumber, requestedBy, plant, status ],
    LineItem: [
      { Value: prNumber,      Label: 'PR Number' },
      { Value: title,         Label: 'Title' },
      { Value: requestedBy,   Label: 'Requested By' },
      { Value: plant,         Label: 'Plant' },
      { Value: requestedDate, Label: 'Date' },
      { Value: totalValue,    Label: 'Est. Value' },
      { Value: status,        Label: 'Status' }
    ]
  }
);

// ─── GOODS RECEIPTS ───────────────────────────────────────────
annotate service.GoodsReceipts with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Goods Receipt',
      TypeNamePlural: 'Goods Receipts',
      Title: { Value: grNumber }
    },
    SelectionFields: [ grNumber, poReference, plant, status ],
    LineItem: [
      { Value: grNumber,       Label: 'GR Number' },
      { Value: poReference,    Label: 'PO Reference' },
      { Value: vendor_vendorID, Label: 'Vendor' },
      { Value: plant,          Label: 'Plant' },
      { Value: postingDate,    Label: 'Posting Date' },
      { Value: movementType,   Label: 'Mvt Type' },
      { Value: totalValue,     Label: 'Value' },
      { Value: status,         Label: 'Status' }
    ]
  }
);

// ─── INVOICE VERIFICATION ─────────────────────────────────────
annotate service.InvoiceVerifications with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Invoice',
      TypeNamePlural: 'Invoices',
      Title: { Value: invoiceNo }
    },
    SelectionFields: [ invoiceNo, vendor_vendorID, poReference, status ],
    LineItem: [
      { Value: invoiceNo,       Label: 'Invoice No.' },
      { Value: vendor_vendorID, Label: 'Vendor' },
      { Value: poReference,     Label: 'PO Reference' },
      { Value: grReference,     Label: 'GR Reference' },
      { Value: invoiceDate,     Label: 'Invoice Date' },
      { Value: dueDate,         Label: 'Due Date' },
      { Value: baseAmount,      Label: 'Base Amount' },
      { Value: taxAmount,       Label: 'Tax' },
      { Value: invoiceAmount,   Label: 'Total Amount' },
      { Value: status,          Label: 'Status' }
    ]
  }
);

// ─── P2P SUMMARY VIEW ─────────────────────────────────────────
annotate service.P2PSummaryView with @(
  UI: {
    HeaderInfo: {
      TypeName: 'P2P Summary',
      TypeNamePlural: 'P2P Summary',
      Title: { Value: poNumber }
    },
    SelectionFields: [ vendorID, plant, poStatus ],
    LineItem: [
      { Value: poNumber,       Label: 'PO Number' },
      { Value: vendorID,       Label: 'Vendor ID' },
      { Value: plant,          Label: 'Plant' },
      { Value: orderedAmount,  Label: 'Ordered (INR)' },
      { Value: poStatus,       Label: 'PO Status' }
    ]
  }
);

// ─── VENDOR SUMMARY VIEW ──────────────────────────────────────
annotate service.VendorSummaryView with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Vendor',
      TypeNamePlural: 'Vendors',
      Title: { Value: vendorName }
    },
    LineItem: [
      { Value: vendorID,     Label: 'Vendor ID' },
      { Value: vendorName,   Label: 'Vendor Name' },
      { Value: country,      Label: 'Country' },
      { Value: paymentTerms, Label: 'Payment Terms' },
      { Value: creditLimit,  Label: 'Credit Limit' }
    ]
  }
);

// ─── AUDIT LOG ────────────────────────────────────────────────
annotate service.AuditLog with @(
  UI: {
    LineItem: [
      { Value: timestamp,   Label: 'Timestamp' },
      { Value: entityType,  Label: 'Entity Type' },
      { Value: entityID,    Label: 'Entity ID' },
      { Value: action,      Label: 'Action' },
      { Value: oldStatus,   Label: 'Old Status' },
      { Value: newStatus,   Label: 'New Status' },
      { Value: performedBy, Label: 'Performed By' },
      { Value: remarks,     Label: 'Remarks' }
    ]
  }
);
