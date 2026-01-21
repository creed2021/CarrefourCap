#!/usr/bin/env bash
set -e

cf target -o "Carrefour ARG_process-automation-95oeuot4" -s SP_DEV

echo "🔧 Construyendo MTAR para DEV..."
mbt build -p cf -t mta_archives -e mtaext/mta-dev.mtaext

echo "🚀 Desplegando en DEV..."
cf deploy mta_archives/asientos-ajustes_1.0.0.mtar -e mtaext/mta-dev.mtaext
