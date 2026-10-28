-- ============================================================
-- PRD — Quitar espacio sobrante en NUMERO de la cuenta 20000802
-- Ticket: ITSAPFI-1377 (BTP - Espacio en cuenta 20000802)
-- Motivo: al crear la cuenta en el Maestro de Cuentas quedó un espacio
-- (al inicio) en el número; la app no permite editar el número.
-- Ejecución manual (el deploy de PRD no modifica la base).
-- ============================================================

-- PASO 1 — Ver el registro afectado (se espera 1 fila; LARGO mayor a LARGO_SIN_ESPACIOS)
SELECT ID, '[' || NUMERO || ']' AS NUMERO_ENTRE_CORCHETES, NOMBRE,
       LENGTH(NUMERO) AS LARGO, LENGTH(TRIM(REPLACE(NUMERO, CHAR(160), ''))) AS LARGO_SIN_ESPACIOS,
       MODIFIEDAT, MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE NUMERO LIKE '%20000802%';

-- PASO 2 — Verificar que no exista otra cuenta con el número ya limpio. Se esperan 0 filas.
SELECT ID, NUMERO, NOMBRE
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE NUMERO = '20000802';

-- PASO 3 — Corregir el número (solo esa cuenta), registrando fecha/usuario de modificación
UPDATE "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
SET NUMERO = '20000802',
    MODIFIEDAT = CURRENT_UTCTIMESTAMP,
    MODIFIEDBY = 'dtagliavini'
WHERE TRIM(REPLACE(NUMERO, CHAR(160), '')) = '20000802'
  AND NUMERO <> '20000802';
-- Se espera "1 row affected"

-- PASO 4 — Verificación posterior: LARGO = 8 y sin espacio entre corchetes
SELECT ID, '[' || NUMERO || ']' AS NUMERO_ENTRE_CORCHETES, NOMBRE, LENGTH(NUMERO) AS LARGO,
       MODIFIEDAT, MODIFIEDBY
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE NUMERO LIKE '%20000802%';

-- PASO 5 (opcional) — Otras cuentas con espacios en el número
SELECT ID, '[' || NUMERO || ']' AS NUMERO_ENTRE_CORCHETES, NOMBRE
FROM "ASIENTOS_MANUALES_PRD"."COM_CARREFOUR_JOURNAL_CUENTA"
WHERE LENGTH(NUMERO) <> LENGTH(TRIM(REPLACE(NUMERO, CHAR(160), '')));