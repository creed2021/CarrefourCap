-- ============================================================
-- PRD — Cambio de Tipo de Cuenta: 25200230 (Provisiones → Patrimonial)
-- ============================================================

-- PASO 1 — Verificación previa: confirmar estado actual de la cuenta
SELECT C.NUMERO, C.NOMBRE, T.CODIGO AS TIPO_ACTUAL, T.NOMBRE AS NOMBRE_TIPO_ACTUAL
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA" C
JOIN "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" T
  ON C.TIPO_ID = T.ID
WHERE C.NUMERO = '25200230';
-- Se espera ver TIPO_ACTUAL = 'PRO' (Provisiones)

-- PASO 2 — Aplicar el cambio de tipo de cuenta
UPDATE "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
SET TIPO_ID = (
    SELECT ID FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" WHERE CODIGO = 'PAT'
)
WHERE NUMERO = '25200230';

-- PASO 3 — Verificación posterior: confirmar que el cambio se aplicó
SELECT C.NUMERO, C.NOMBRE, T.CODIGO AS TIPO_NUEVO, T.NOMBRE AS NOMBRE_TIPO_NUEVO
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA" C
JOIN "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" T
  ON C.TIPO_ID = T.ID
WHERE C.NUMERO = '25200230';
-- Se espera ver TIPO_NUEVO = 'PAT' (Patrimonial)