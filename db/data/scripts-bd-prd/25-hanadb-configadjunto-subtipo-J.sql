-- ============================================================
-- ABTP - Carrefour
-- ITSAP-1349 - Configuración de adjuntos para SubTipoAsiento 'J'
-- Tipo de Asiento asociado: codigo = '2' (Ajustes de asientos de cierre)
-- Sin esta fila la app muestra "No existe configuración de adjuntos
-- para el tipo y subtipo de asiento seleccionado."
-- ============================================================

-- 1) Verificación previa: confirmar que no exista ya la configuración
SELECT C.ID, T.CODIGO AS TIPO, S.CODIGO AS SUBTIPO, C.OBLIGATORIO
FROM COM_CARREFOUR_JOURNAL_CONFIGADJUNTOOBLIGATORIO C
JOIN COM_CARREFOUR_JOURNAL_TIPOASIENTO T
  ON C.TIPOASIENTO_ID = T.ID
JOIN COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO S
  ON C.SUBTIPOASIENTO_ID = S.ID
WHERE T.CODIGO = '2'
  AND S.CODIGO = 'J';

-- 2) Alta de la configuración de adjunto obligatorio para 'J'
INSERT INTO COM_CARREFOUR_JOURNAL_CONFIGADJUNTOOBLIGATORIO
  (ID, TIPOASIENTO_ID, SUBTIPOASIENTO_ID, OBLIGATORIO, MODIFIEDBY)
SELECT
  SYSUUID,
  T.ID,
  S.ID,
  TRUE,
  'it-script'
FROM COM_CARREFOUR_JOURNAL_TIPOASIENTO T
JOIN COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO S
  ON S.TIPOASIENTO_ID = T.ID
WHERE T.CODIGO = '2'
  AND S.CODIGO = 'J';

-- 3) Verificación posterior
SELECT C.ID, T.CODIGO AS TIPO, S.CODIGO AS SUBTIPO, C.OBLIGATORIO, C.MODIFIEDBY
FROM COM_CARREFOUR_JOURNAL_CONFIGADJUNTOOBLIGATORIO C
JOIN COM_CARREFOUR_JOURNAL_TIPOASIENTO T
  ON C.TIPOASIENTO_ID = T.ID
JOIN COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO S
  ON C.SUBTIPOASIENTO_ID = S.ID
WHERE T.CODIGO = '2'
  AND S.CODIGO = 'J';
