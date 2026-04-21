#!/bin/bash
set -e
echo "========================================"
echo " NovaBuild P2P — HANA Cloud Deployment"
echo "========================================"
for cmd in cds cf; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "ERROR: $cmd not installed. Aborting."; exit 1
    fi
done
echo "Step 1: Verify CF login..."
cf target || { echo "ERROR: Not logged into CF. Run: cf login"; exit 1; }
echo "Step 2: Check/create HANA service instance..."
cf service novabuild-hana-db > /dev/null 2>&1 || {
    echo "Creating HANA service..."
    cf create-service hana-cloud hdi-shared novabuild-hana-db
    echo "Waiting 60s for service creation..."; sleep 60
}
echo "Step 3: Check/create XSUAA service instance..."
cf service novabuild-xsuaa > /dev/null 2>&1 || {
    echo "Creating XSUAA service..."
    cf create-service xsuaa application novabuild-xsuaa -c xs-security.json
    echo "Waiting 30s..."; sleep 30
}
echo "Step 4: Deploy CDS schema to HANA..."
CDS_ENV=production cds deploy --to hana
echo ""
echo "HANA deployment COMPLETE"
echo "Verify tables in BTP HANA Database Explorer"
