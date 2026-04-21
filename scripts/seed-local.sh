#!/bin/bash
# Local SQLite seeding script for development
set -e
echo "Seeding local SQLite database..."
CDS_ENV=development cds deploy --to sqlite:novabuild-dev.db
echo "Local DB ready: novabuild-dev.db"
echo "Start server with: cds watch"
