#!/usr/bin/env bash
set -e

cf target -o "Carrefour ARG_process-automation-95oeuot4" -s SP_QAS

echo "🔧 Construyendo MTAR para QAS..."
mbt build -p cf -t mta_archives -e mtaext/mta-qas.mtaext

echo "🚀 Desplegando en QAS..."
cf deploy mta_archives/asientos-ajustes_1.0.0.mtar -e mtaext/mta-qas.mtaext
