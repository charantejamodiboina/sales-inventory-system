#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/backend"

echo "===================================================================="
echo " ApexTrack Sales & Inventory Management System - Assessment Demo"
echo "===================================================================="
echo ""
echo "[1/2] Seeding initial database..."
python -m app.seed

echo ""
echo "[2/2] Starting server on http://127.0.0.1:8000 ..."
echo "--------------------------------------------------------------------"
echo "  Application UI:       http://127.0.0.1:8000"
echo "  Interactive API Docs: http://127.0.0.1:8000/docs"
echo "--------------------------------------------------------------------"
echo "  DEMO CREDENTIALS:"
echo "    Sales User:    sales    / Sales@123"
echo "    Manager:       manager  / Manager@123"
echo "    Administrator: admin    / Admin@123"
echo "--------------------------------------------------------------------"
echo ""

python run_server.py

