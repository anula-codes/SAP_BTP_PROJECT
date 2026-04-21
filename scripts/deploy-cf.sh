#!/bin/bash
set -e
echo "========================================"
echo " NovaBuild P2P — BTP CF Deployment"
echo "========================================"
for cmd in cf mbt cds npm; do
    if ! command -v "$cmd" &> /dev/null; then echo "ERROR: $cmd not installed"; exit 1; fi
done
echo "Step 1: Run tests..."
npm test || { echo "Tests failed — aborting"; exit 1; }
echo "Step 2: Install production deps..."
npm ci --production
echo "Step 3: CDS production build..."
cds build --production
echo "Step 4: MTA build..."
mbt build -p=cf
echo "Step 5: CF deploy..."
cf target
MTAR=$(ls mta_archives/*.mtar | tail -1)
cf deploy "$MTAR" --strategy rolling
APP_URL=$(cf app novabuild-p2p-analytics-srv 2>/dev/null | grep routes | awk '{print $2}' | head -1)
echo "========================================"
echo " Deployment COMPLETE: https://$APP_URL"
echo "========================================"
