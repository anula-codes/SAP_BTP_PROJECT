# NovaBuild P2P Analytics — SAP CAP Capstone Project

> **SAP Certified Associate — Backend Developer — SAP Cloud Application Programming Model**  
> KIIT University | Academic Year 2024–25

A production-grade **Procure-to-Pay (P2P) Analytics Service** built on **SAP Cloud Application Programming Model (CAP)**, deployed on **SAP BTP Cloud Foundry**.

---

## Project Overview

NovaBuild Manufacturing Pvt. Ltd. is a fictitious industrial equipment manufacturer. This project implements a backend analytics service covering the full P2P cycle:

```
Purchase Requisition → Purchase Order → Goods Receipt → Invoice Verification
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│           SAP Fiori Elements (List Reports)             │
├─────────────────────────────────────────────────────────┤
│           OData V4 API  (/p2p/)  — SAP CAP Node.js     │
├────────────────────────┬────────────────────────────────┤
│   CDS Data Models      │   Business Logic Handlers      │
│   (db/schema.cds)      │   (srv/p2p-service.js)         │
├────────────────────────┴────────────────────────────────┤
│        SAP HANA Cloud  /  SQLite (local dev)            │
├─────────────────────────────────────────────────────────┤
│        SAP BTP Cloud Foundry  (mta.yaml deployment)     │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
novabuild-p2p-analytics/
├── db/
│   ├── schema.cds              # Core entities: Vendors, Materials, PRs, POs, GRs, Invoices
│   ├── views.cds               # Analytical CDS views (P2PSummaryView, MonthlySpendView, etc.)
│   └── data/                   # CSV seed data (10 vendors, 20 materials, 15 POs, ...)
│       ├── novabuild.p2p-Vendors.csv
│       ├── novabuild.p2p-Materials.csv
│       ├── novabuild.p2p-PurchaseRequisitions.csv
│       ├── novabuild.p2p-PurchaseOrders.csv
│       ├── novabuild.p2p-GoodsReceipts.csv
│       └── novabuild.p2p-InvoiceVerifications.csv
├── srv/
│   ├── p2p-service.cds         # OData V4 service definition with actions & functions
│   ├── p2p-service.js          # Business logic: before/on/after handlers, validations
│   └── annotations.cds         # Fiori UI annotations (LineItem, FieldGroup, Chart)
├── app/webapp/                 # SAP Fiori Elements frontend
│   ├── manifest.json           # App descriptor
│   ├── Component.js            # SAPUI5 component
│   ├── index.html              # Launchpad sandbox
│   └── i18n/i18n.properties    # Translations
├── test/
│   ├── p2p-purchase-requisitions.test.js
│   ├── p2p-purchase-orders.test.js
│   ├── p2p-goods-receipts.test.js
│   ├── p2p-invoices.test.js
│   ├── p2p-analytics-views.test.js
│   ├── p2p-auth.test.js
│   ├── p2p-integration.test.js  # End-to-end P2P flow test
│   └── tests.http               # VS Code REST Client — 37 test cases
├── scripts/
│   ├── deploy-hana.sh           # HANA Cloud schema deployment
│   ├── deploy-cf.sh             # Full BTP MTA deployment
│   └── seed-local.sh            # Local SQLite seeding
├── .github/workflows/
│   ├── ci.yml                   # Full CI/CD: lint → test → build → MTA → deploy
│   └── pr-checks.yml            # PR validation checks
├── xs-security.json             # XSUAA scopes, roles, role collections
├── mta.yaml                     # MTA descriptor for BTP deployment
├── package.json                 # Dependencies + Jest + CDS config + mock users
├── .env.example                 # Environment variable template
└── .gitignore
```

---

## Quick Start (Local Development)

### Prerequisites

```bash
node --version    # v20+
npm --version     # v10+
npm install -g @sap/cds-dk
```

### 1. Clone and install

```bash
git clone https://github.com/your-org/novabuild-p2p-analytics.git
cd novabuild-p2p-analytics
npm install
```

### 2. Start locally (SQLite in-memory)

```bash
cds watch
# Server starts at http://localhost:4004
# Fiori preview: http://localhost:4004/$fiori-preview
# OData metadata: http://localhost:4004/p2p/$metadata
```

### 3. Run tests

```bash
npm test                  # All tests
npm run test:coverage     # With coverage report
```

### 4. Explore the API

Open `http://localhost:4004` — you'll see:

- `[GET] /p2p/PurchaseOrders` — All purchase orders
- `[GET] /p2p/P2PSummaryView` — Aggregated P2P spend
- `[GET] /p2p/getDashboardKPIs()` — Live KPI function
- `[POST] /p2p/PurchaseRequisitions({id})/approvePR` — Approve action

Use `test/tests.http` with VS Code REST Client for all 37 test scenarios.

---

## Mock Users (Development)

Configured in `package.json` under `cds.requires.[development].auth`:

| User  | Role            | Can Do |
|-------|-----------------|--------|
| alice | P2PApprover + P2PViewer | Full access — approve PRs, post GRs, approve invoices |
| bob   | P2PViewer       | Read-only — all reports and analytics |
| carol | (none)          | Unauthorized — all requests return 401 |

Use `Basic YWxpY2U6` header for alice, `Basic Ym9iOg==` for bob in REST client.

---

## OData Service Endpoints

| Entity / Function | Method | Description |
|-------------------|--------|-------------|
| `/p2p/Vendors` | GET | Vendor master (sensitive fields excluded) |
| `/p2p/Materials` | GET | Material master |
| `/p2p/PurchaseRequisitions` | GET/POST | PR management |
| `/p2p/PurchaseRequisitions({id})/approvePR` | POST | Approve a PR |
| `/p2p/PurchaseRequisitions({id})/rejectPR` | POST | Reject a PR |
| `/p2p/PurchaseOrders` | GET/POST | PO management |
| `/p2p/PurchaseOrders({id})/cancelPO` | POST | Cancel a PO |
| `/p2p/GoodsReceipts` | GET/POST | Post GRs (insert-only) |
| `/p2p/InvoiceVerifications` | GET/POST | Invoice management |
| `/p2p/InvoiceVerifications({id})/approveInvoice` | POST | Approve invoice |
| `/p2p/InvoiceVerifications({id})/blockInvoice` | POST | Block invoice |
| `/p2p/P2PSummaryView` | GET | 3-way match overview |
| `/p2p/MonthlySpendView` | GET | Monthly spend by vendor |
| `/p2p/OpenPOTrackerView` | GET | Open/overdue POs |
| `/p2p/VendorPerformanceView` | GET | Vendor spend metrics |
| `/p2p/PRtoPoConversionView` | GET | PR-to-PO aging |
| `/p2p/getDashboardKPIs()` | GET | Live KPI function |
| `/p2p/getOpenPOs(plant,purchGroup)` | GET | Filtered open POs |
| `/p2p/getApprovalQueue()` | GET | PRs pending approval |
| `/p2p/AuditLog` | GET | State change history |

---

## HANA Cloud Deployment

```bash
# 1. Login to CF
cf login -a https://api.cf.us10.hana.ondemand.com

# 2. Deploy schema to HANA
./scripts/deploy-hana.sh

# 3. Full app deployment
./scripts/deploy-cf.sh
```

Or use the automated CI/CD pipeline — push to `main` triggers full deployment.

---

## CI/CD Pipeline (GitHub Actions)

```
Push to any branch
    ↓
[lint]  ESLint + npm audit
    ↓
[test]  Jest on Node 18 + 20 (matrix)
    ↓
[build-validate]  CDS compile + production build
    ↓
[mta-build]  MTA archive (main/develop only)
    ↓
[deploy-staging]  → develop branch → BTP Dev space
[deploy-btp]      → main branch    → BTP Production
```

Required GitHub Secrets:
- `CF_API_URL`, `CF_USERNAME`, `CF_PASSWORD`
- `CF_ORG`, `CF_SPACE`, `CF_STAGING_SPACE`

---

## XSUAA Security

Two roles are defined in `xs-security.json`:

| Role Collection | Scopes | Users |
|-----------------|--------|-------|
| `NovaBuild_P2P_Viewer` | `P2PViewer` | Buyers, Finance analysts |
| `NovaBuild_P2P_Approver` | `P2PViewer` + `P2PApprover` | Procurement managers |

Assign role collections in BTP Cockpit → Security → Role Collections.

---

## Certification Alignment

This project covers all key exam areas for **SAP Certified Associate — Backend Developer — SAP CAP**:

| Exam Area | Covered By |
|-----------|-----------|
| CDS Data Modeling | `db/schema.cds`, `db/views.cds` |
| OData Service Exposure | `srv/p2p-service.cds` |
| Service Handlers | `srv/p2p-service.js` |
| HANA Cloud | `mta.yaml` HANA resource, `scripts/deploy-hana.sh` |
| XSUAA Auth | `xs-security.json`, `@requires` annotations |
| BTP Deployment | `mta.yaml`, `scripts/deploy-cf.sh` |
| Testing | `test/*.test.js` (Jest), `test/tests.http` |
| CI/CD | `.github/workflows/ci.yml` |
| Fiori Elements | `app/webapp/`, `srv/annotations.cds` |

---

## License

MIT — For academic submission to KIIT University, 2024–25.
