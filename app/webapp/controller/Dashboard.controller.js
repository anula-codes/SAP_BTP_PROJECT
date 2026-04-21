// ============================================================
// NovaBuild P2P Analytics — Dashboard Controller
// File: app/webapp/controller/Dashboard.controller.js
// ============================================================
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("novabuild.p2p.analytics.controller.Dashboard", {

        // ─── Lifecycle ────────────────────────────────────────────
        onInit: function () {
            this._initModels();
            this._loadDashboardData();
        },

        _initModels: function () {
            const oViewModel = new JSONModel({
                busy: true,
                selectedTab: "dashboard",
                kpis: {},
                purchaseOrders: [],
                purchaseRequisitions: [],
                goodsReceipts: [],
                invoices: [],
                p2pSummary: [],
                monthlySpend: [],
                vendorPerformance: [],
                openPOTracker: [],
                auditLog: [],
                filterPlant: "",
                filterStatus: "",
                filterSearch: ""
            });
            this.getView().setModel(oViewModel, "view");
        },

        // ─── Data Loading ─────────────────────────────────────────
        _loadDashboardData: function () {
            const oModel  = this.getView().getModel("view");
            const oOData  = this.getView().getModel();      // default OData V4 model
            if (!oOData) {
                // Standalone mode — load mock data
                this._loadMockData();
                return;
            }

            oModel.setProperty("/busy", true);
            Promise.all([
                this._fetchKPIs(oOData),
                this._fetchEntity(oOData, "PurchaseOrders",  "/purchaseOrders",  "$top=50&$orderby=docDate desc"),
                this._fetchEntity(oOData, "PurchaseRequisitions", "/purchaseRequisitions", "$top=30&$filter=status eq 'PENDING'"),
                this._fetchEntity(oOData, "P2PSummaryView",  "/p2pSummary",      "$top=30"),
                this._fetchEntity(oOData, "MonthlySpendView","/monthlySpend",    "$orderby=fiscalYear desc,fiscalMonth desc&$top=12"),
                this._fetchEntity(oOData, "VendorPerformanceView", "/vendorPerformance", "$orderby=totalSpend desc&$top=10"),
                this._fetchEntity(oOData, "OpenPOTrackerView",  "/openPOTracker",  "$top=20"),
                this._fetchEntity(oOData, "AuditLog",        "/auditLog",        "$top=15&$orderby=timestamp desc")
            ]).then(() => {
                oModel.setProperty("/busy", false);
            }).catch(err => {
                console.error("Data load error:", err);
                this._loadMockData();
            });
        },

        _fetchKPIs: function (oOData) {
            const oModel = this.getView().getModel("view");
            return fetch("/p2p/getDashboardKPIs()", {
                headers: { "Accept": "application/json" }
            }).then(r => r.json())
              .then(data => {
                  const kpis = data.value || data;
                  oModel.setProperty("/kpis", kpis);
              }).catch(() => {
                  oModel.setProperty("/kpis", {
                      totalOpenPOs: 6, totalPendingPRs: 4,
                      totalSpendMTD: 7255250, pendingInvoices: 1,
                      overdueDeliveries: 2
                  });
              });
        },

        _fetchEntity: function (oOData, entitySet, modelPath, query) {
            const oModel = this.getView().getModel("view");
            const url = `/p2p/${entitySet}?${query || ""}`;
            return fetch(url, { headers: { "Accept": "application/json" } })
                .then(r => r.json())
                .then(data => {
                    oModel.setProperty(modelPath, data.value || data);
                }).catch(() => { /* silent fail — mock handles it */ });
        },

        _loadMockData: function () {
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/kpis", {
                totalOpenPOs: 7, totalPendingPRs: 4,
                totalSpendMTD: 7255250, pendingInvoices: 1,
                overdueDeliveries: 2
            });
            oModel.setProperty("/purchaseOrders", [
                { poNumber:"PO0000007", vendorName:"Cummins India Limited",   plant:"NB10", docDate:"2025-02-12", totalValue:540000,  status:"OPEN"               },
                { poNumber:"PO0000009", vendorName:"Hindustan Zinc Ltd",       plant:"NB10", docDate:"2025-02-20", totalValue:320000,  status:"OPEN"               },
                { poNumber:"PO0000010", vendorName:"Thermax Ltd",              plant:"NB10", docDate:"2025-02-25", totalValue:890000,  status:"OPEN"               },
                { poNumber:"PO0000011", vendorName:"Larsen & Toubro Ltd",      plant:"NB10", docDate:"2025-03-01", totalValue:1250000, status:"OPEN"               },
                { poNumber:"PO0000012", vendorName:"Tata Steel Limited",       plant:"NB10", docDate:"2025-03-05", totalValue:425000,  status:"OPEN"               },
                { poNumber:"PO0000003", vendorName:"Siemens India Limited",    plant:"NB10", docDate:"2025-01-18", totalValue:255000,  status:"PARTIALLY_DELIVERED"},
                { poNumber:"PO0000008", vendorName:"Bosch India Ltd",          plant:"NB20", docDate:"2025-02-15", totalValue:127500,  status:"PARTIALLY_DELIVERED"},
                { poNumber:"PO0000001", vendorName:"Tata Steel Limited",       plant:"NB10", docDate:"2025-01-10", totalValue:855000,  status:"FULLY_DELIVERED"    },
                { poNumber:"PO0000002", vendorName:"SKF India Ltd",            plant:"NB10", docDate:"2025-01-12", totalValue:48750,   status:"INVOICED"           }
            ]);
            oModel.setProperty("/purchaseRequisitions", [
                { prNumber:"PR0000006", title:"Annual Maintenance Contract",  requestedBy:"EMP005", plant:"NB10", requestedDate:"2025-02-10", totalValue:300000, status:"PENDING" },
                { prNumber:"PR0000007", title:"Paint and Coating Materials",  requestedBy:"EMP002", plant:"NB20", requestedDate:"2025-02-14", totalValue:112000, status:"PENDING" },
                { prNumber:"PR0000009", title:"Calibration Services FY2025",  requestedBy:"EMP005", plant:"NB10", requestedDate:"2025-03-01", totalValue:90000,  status:"PENDING" },
                { prNumber:"PR0000010", title:"Aluminium Ingot Q2",           requestedBy:"EMP001", plant:"NB10", requestedDate:"2025-03-10", totalValue:1225000,status:"PENDING" }
            ]);
            oModel.setProperty("/invoices", [
                { invoiceNo:"INV-SE-20890", vendorName:"Siemens India",  invoiceAmount:150450, status:"APPROVED", dueDate:"2025-04-03" },
                { invoiceNo:"INV-SE-21001", vendorName:"Siemens India",  invoiceAmount:460200, status:"APPROVED", dueDate:"2025-04-21" },
                { invoiceNo:"INV-SE-21045", vendorName:"Siemens India",  invoiceAmount:460200, status:"PENDING",  dueDate:"2025-04-24" }
            ]);
            oModel.setProperty("/vendorPerformance", [
                { vendorName:"Tata Steel",     totalSpend:1280000, totalOrders:2 },
                { vendorName:"Siemens India",  totalSpend:1715000, totalOrders:3 },
                { vendorName:"Thermax Ltd",    totalSpend:890000,  totalOrders:1 },
                { vendorName:"L&T",            totalSpend:1250000, totalOrders:1 },
                { vendorName:"Cummins",        totalSpend:540000,  totalOrders:1 },
                { vendorName:"Hindustan Zinc", totalSpend:320000,  totalOrders:1 },
                { vendorName:"Bosch India",    totalSpend:127500,  totalOrders:1 },
                { vendorName:"SKF India",      totalSpend:268750,  totalOrders:2 }
            ]);
            oModel.setProperty("/monthlySpend", [
                { fiscalYear:2025, fiscalMonth:1, totalSpend:1194750, poCount:4 },
                { fiscalYear:2025, fiscalMonth:2, totalSpend:2732500, poCount:6 },
                { fiscalYear:2025, fiscalMonth:3, totalSpend:2620000, poCount:5 }
            ]);
            oModel.setProperty("/auditLog", [
                { entityType:"PurchaseRequisition", entityID:"PR0000001", action:"APPROVED",        performedBy:"alice@novabuild.com", timestamp:"2025-01-08T10:30:00Z" },
                { entityType:"PurchaseOrder",       entityID:"PO0000001", action:"CREATED",         performedBy:"alice@novabuild.com", timestamp:"2025-01-10T09:15:00Z" },
                { entityType:"PurchaseRequisition", entityID:"PR0000008", action:"REJECTED",        performedBy:"alice@novabuild.com", timestamp:"2025-02-21T14:00:00Z" },
                { entityType:"InvoiceVerification", entityID:"INV-SE-20890", action:"INVOICE_APPROVED", performedBy:"alice@novabuild.com", timestamp:"2025-02-05T11:30:00Z" },
                { entityType:"PurchaseOrder",       entityID:"PO0000013", action:"CANCELLED",       performedBy:"alice@novabuild.com", timestamp:"2025-03-09T16:45:00Z" }
            ]);
            oModel.setProperty("/busy", false);
        },

        // ─── Navigation ───────────────────────────────────────────
        onTabSelect: function (oEvent) {
            const sKey = oEvent.getSource().data("tab");
            this.getView().getModel("view").setProperty("/selectedTab", sKey);
        },

        // ─── PR Actions ───────────────────────────────────────────
        onApprovePR: function (oEvent) {
            const sPR = oEvent.getSource().data("prNumber");
            MessageBox.confirm(`Approve Purchase Requisition ${sPR}?`, {
                title: "Confirm Approval",
                onClose: (sAction) => {
                    if (sAction === "OK") {
                        this._callAction("approvePR", sPR, "PR", "Approved", "green");
                    }
                }
            });
        },

        onRejectPR: function (oEvent) {
            const sPR = oEvent.getSource().data("prNumber");
            MessageBox.show(`Reject PR ${sPR}?`, {
                icon: MessageBox.Icon.WARNING,
                title: "Reject PR",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: (sAction) => {
                    if (sAction === "OK") {
                        this._callAction("rejectPR", sPR, "PR", "Rejected", "red");
                    }
                }
            });
        },

        _callAction: function (sAction, sID, sType, sLabel, sColor) {
            const oModel = this.getView().getModel("view");
            // In real deployment this calls OData action
            const prs = oModel.getProperty("/purchaseRequisitions");
            const updated = prs.filter(pr => pr.prNumber !== sID);
            oModel.setProperty("/purchaseRequisitions", updated);

            const kpis = oModel.getProperty("/kpis");
            kpis.totalPendingPRs = Math.max(0, (kpis.totalPendingPRs || 1) - 1);
            oModel.setProperty("/kpis", kpis);

            MessageToast.show(`${sType} ${sID} — ${sLabel} successfully`);
        },

        // ─── Filter ───────────────────────────────────────────────
        onFilterChange: function () {
            // Filter binding update handled by XML binding expressions
        },

        // ─── Refresh ──────────────────────────────────────────────
        onRefresh: function () {
            MessageToast.show("Refreshing data…");
            this._loadDashboardData();
        },

        // ─── Format Helpers ───────────────────────────────────────
        formatCurrency: function (val) {
            if (val === null || val === undefined) return "—";
            return new Intl.NumberFormat("en-IN", {
                style: "currency", currency: "INR",
                maximumFractionDigits: 0
            }).format(val);
        },

        formatDate: function (val) {
            if (!val) return "—";
            return new Date(val).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric"
            });
        },

        formatStatus: function (val) {
            const map = {
                "OPEN": "Open", "PENDING": "Pending", "APPROVED": "Approved",
                "PAID": "Paid", "PARTIALLY_DELIVERED": "Partial",
                "FULLY_DELIVERED": "Full Del.", "INVOICED": "Invoiced",
                "CANCELLED": "Cancelled", "BLOCKED": "Blocked",
                "REJECTED": "Rejected", "CONVERTED": "Converted", "POSTED": "Posted"
            };
            return map[val] || val;
        },

        formatStatusClass: function (val) {
            const map = {
                "OPEN": "nb-badge-open", "PENDING": "nb-badge-pending",
                "APPROVED": "nb-badge-approved", "PAID": "nb-badge-paid",
                "PARTIALLY_DELIVERED": "nb-badge-partial",
                "FULLY_DELIVERED": "nb-badge-full", "INVOICED": "nb-badge-invoiced",
                "CANCELLED": "nb-badge-cancel", "BLOCKED": "nb-badge-blocked",
                "REJECTED": "nb-badge-rejected", "CONVERTED": "nb-badge-convert",
                "POSTED": "nb-badge-approved"
            };
            return "nb-badge " + (map[val] || "nb-badge-open");
        }
    });
});
