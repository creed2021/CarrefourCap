-- ============================================================
-- ABTP - Carrefour
-- Alta de SubTipoAsiento 'I' - Asientos con varias cuentas Patrimoniales
-- Tipo de Asiento asociado: codigo = '2'
-- Autor: Dante Tagliavini
-- ============================================================

-- 1) Verificación previa (opcional): confirmar que no exista ya el código 'I'
--    para el TipoAsiento '2' antes de insertar.
SELECT S.ID, S.CODIGO, S.NOMBRE, S.TIPOASIENTO_ID
FROM COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO S
JOIN COM_CARREFOUR_JOURNAL_TIPOASIENTO T
  ON S.TIPOASIENTO_ID = T.ID
WHERE T.CODIGO = '2'
  AND S.CODIGO = 'I';

-- 2) INSERT con subquery — resuelve el TIPOASIENTO_ID dinámicamente,
--    sin necesidad de pegar el GUID a mano en cada ambiente.
INSERT INTO COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO
  (ID, CODIGO, NOMBRE, TIPOASIENTO_ID, UMBRALMINIMOASIENTO, MODIFIEDBY)
SELECT
  SYSUUID,
  'I',
  'Asientos con varias cuentas Patrimoniales',
  T.ID,
  5000000.00,
  'it-script'
FROM COM_CARREFOUR_JOURNAL_TIPOASIENTO T
WHERE T.CODIGO = '2';

-- 3) Verificación posterior: confirmar el alta
SELECT S.ID, S.CODIGO, S.NOMBRE, S.TIPOASIENTO_ID, S.UMBRALMINIMOASIENTO, S.MODIFIEDBY
FROM COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO S
JOIN COM_CARREFOUR_JOURNAL_TIPOASIENTO T
  ON S.TIPOASIENTO_ID = T.ID
WHERE T.CODIGO = '2'
  AND S.CODIGO = 'I';