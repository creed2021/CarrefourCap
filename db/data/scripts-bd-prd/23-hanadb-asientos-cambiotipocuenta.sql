-- ============================================================
-- PRD — Cambio de Tipo de Cuenta: 25200231 (Provisiones → Patrimonial)
-- ============================================================

-- PASO 1 — Verificación previa: confirmar estado actual de la cuenta
SELECT NUMERO, NOMBRE, TIPO_ID, CREATEDAT, CREATEDBY, MODIFIEDAT, MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE NUMERO = '25200231';
-- Se espera ver TIPO_ID correspondiente a PRO (mismo que tenía la cuenta 25200230 antes de su cambio)

-- PASO 2 — Aplicar el cambio de tipo de cuenta, registrando fecha/usuario de modificación
UPDATE "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
SET TIPO_ID = (
        SELECT ID FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_TIPOCUENTA" WHERE CODIGO = 'PAT'
    ),
    MODIFIEDAT = CURRENT_UTCTIMESTAMP,
    MODIFIEDBY = 'hugo_cherri@carrefour.com'
WHERE NUMERO = '25200231';

-- PASO 3 — Verificación posterior
SELECT NUMERO, NOMBRE, TIPO_ID, CREATEDAT, CREATEDBY, MODIFIEDAT, MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE NUMERO = '25200231';
-- Se espera ver TIPO_ID correspondiente a PAT, y MODIFIEDAT/MODIFIEDBY actualizados