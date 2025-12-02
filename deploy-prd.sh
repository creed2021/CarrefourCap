#!/usr/bin/env bash

echo "⚠️  Confirmar deploy a PRODUCCIÓN"
read -p "Escribe: QUIERO_DEPLOYAR_EN_PRD > " c1

if [ "$c1" != "QUIERO_DEPLOYAR_EN_PRD" ]; then
  echo "❌ Primera confirmación incorrecta."
  exit 1
fi

read -p "Segunda confirmación (escribe: SI_QUIERO_PRD) > " c2

if [ "$c2" != "SI_QUIERO_PRD" ]; then
  echo "❌ Segunda confirmación incorrecta."
  exit 1
fi


set -e

cf target -o carrefour -s SP_PRD

echo "🔧 Construyendo MTAR para PRD..."
mbt build -p cf -t mta_archives -e mtaext/mta-prd.mtaext

echo "🚀 Desplegando en PRD..."
cf deploy mta_archives/asientos-ajustes_1.0.0.mtar -e mtaext/mta-prd.mtaext
