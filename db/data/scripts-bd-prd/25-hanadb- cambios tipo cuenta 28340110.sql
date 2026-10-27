-- ============================================================
-- PRD — Cambio de Tipo de Cuenta: 28340110 (Provisiones → Patrimonial)
-- Ticket: ITSAPFI-1367
-- Ejecución manual (el deploy de PRD no modifica la base).
-- ============================================================

-- PASO 1 — Verificación previa: confirmar estado actual de la cuenta
SELECT C.NUMERO, C.NOMBRE, T.CODIGO AS TIPO_ACTUAL, T.NOMBRE AS NOMBRE_TIPO_ACTUAL,
       C.CREATEDAT, C.CREATEDBY, C.MODIFIEDAT, C.MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA" C
JOIN "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" T
  ON C.TIPO_ID = T.ID
WHERE C.NUMERO = '28340110';
-- Se espera 1 fila con TIPO_ACTUAL = 'PRO' (Provisiones)

-- PASO 2 — Aplicar el cambio, registrando fecha/usuario de modificación.
-- Solo modifica la cuenta si hoy es PRO: si ya tuviera otro tipo, no se toca.
UPDATE "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
SET TIPO_ID = (
        SELECT ID FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" WHERE CODIGO = 'PAT'
    ),
    MODIFIEDAT = CURRENT_UTCTIMESTAMP,
    MODIFIEDBY = 'dtagliavini'
WHERE NUMERO = '28340110'
  AND TIPO_ID = (
        SELECT ID FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" WHERE CODIGO = 'PRO'
    );
-- Se espera "1 row affected"

-- PASO 3 — Verificación posterior
SELECT C.NUMERO, C.NOMBRE, T.CODIGO AS TIPO_NUEVO, T.NOMBRE AS NOMBRE_TIPO_NUEVO,
       C.MODIFIEDAT, C.MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA" C
JOIN "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" T
  ON C.TIPO_ID = T.ID
WHERE C.NUMERO = '28340110';
-- Se espera TIPO_NUEVO = 'PAT' (Patrimonial), con MODIFIEDAT/MODIFIEDBY actualizados