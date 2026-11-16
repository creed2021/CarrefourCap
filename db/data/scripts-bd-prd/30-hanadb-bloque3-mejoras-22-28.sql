-- ============================================================
-- PRD — Bloque 3 (Ticket ITSAPFI-1374): estructura para Mejoras 22 y 28
--   Mejora 22: aviso de contabilización configurable
--     - Aprobador: ConfigAprobador.notificarContabilizacion (default FALSE)
--     - Solicitante: Empleado.notificarContabilizacionSolicitante (default TRUE)
--     - Vistas/borradores nuevos: ConfigNotificaciones y AvisoSolicitante
--   Mejora 28: columna calculada soloPropias en la vista GestionaAsientos_CabeceraAsiento
-- Ejecución manual (el deploy de PRD no modifica la base).
-- Ejecutar ANTES de desplegar la versión del Bloque 3 en PRD.
-- Generado comparando "cds compile --to sql --dialect hana" del commit 23e2bc2 (script 29) contra el modelo actual.
-- ============================================================

-- PASO 1 — Verificar que existan las tablas que se van a modificar. Se esperan 4 filas.
SELECT TABLE_NAME
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'ASIENTOS_MANUALES_PRD'
  AND TABLE_NAME IN (
    'COM_CARREFOUR_JOURNAL_EMPLEADO',
    'COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR',
    'GESTIONAASIENTOS_EMPLEADOS_DRAFTS',
    'CATALOGSERVICE_CONFIGAPROBADORES_DRAFTS'
  )
ORDER BY TABLE_NAME;

-- PASO 2 — Verificar que las columnas y tablas nuevas NO existan todavía. Se esperan 0 filas en ambas consultas.
SELECT TABLE_NAME, COLUMN_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'ASIENTOS_MANUALES_PRD'
  AND COLUMN_NAME IN ('NOTIFICARCONTABILIZACION', 'NOTIFICARCONTABILIZACIONSOLICITANTE');

SELECT TABLE_NAME
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'ASIENTOS_MANUALES_PRD'
  AND TABLE_NAME IN ('CATALOGSERVICE_CONFIGNOTIFICACIONES_DRAFTS', 'CATALOGSERVICE_AVISOSOLICITANTE_DRAFTS');

-- PASO 3 — Columnas nuevas en tablas de datos
ALTER TABLE "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR
ADD (notificarContabilizacion BOOLEAN DEFAULT FALSE);

ALTER TABLE "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_EMPLEADO
ADD (notificarContabilizacionSolicitante BOOLEAN DEFAULT TRUE);

-- Asegurar el valor por defecto en los registros existentes (aprobadores: No / solicitantes: Sí)
UPDATE "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR
SET notificarContabilizacion = FALSE
WHERE notificarContabilizacion IS NULL;

UPDATE "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_EMPLEADO
SET notificarContabilizacionSolicitante = TRUE
WHERE notificarContabilizacionSolicitante IS NULL;

-- PASO 4 — Columnas nuevas en tablas de borradores existentes
ALTER TABLE "ASIENTOS_MANUALES_PRD".CATALOGSERVICE_CONFIGAPROBADORES_DRAFTS
ADD (notificarContabilizacion BOOLEAN NULL DEFAULT FALSE);

ALTER TABLE "ASIENTOS_MANUALES_PRD".GESTIONAASIENTOS_EMPLEADOS_DRAFTS
ADD (notificarContabilizacionSolicitante BOOLEAN NULL DEFAULT TRUE);

-- PASO 5 — Tablas de borradores nuevas (apps de notificaciones)
CREATE TABLE "ASIENTOS_MANUALES_PRD".CatalogService_ConfigNotificaciones_drafts (
  ID NVARCHAR(36) NOT NULL,
  empleado_ID NVARCHAR(36) NULL,
  sector_ID NVARCHAR(36) NULL,
  cargo_ID NVARCHAR(36) NULL,
  notificarContabilizacion BOOLEAN NULL DEFAULT FALSE,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE "ASIENTOS_MANUALES_PRD".CatalogService_AvisoSolicitante_drafts (
  ID NVARCHAR(36) NOT NULL,
  nombre NVARCHAR(50) NULL,
  notificarContabilizacionSolicitante BOOLEAN NULL DEFAULT TRUE,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

-- PASO 6 — Vistas existentes que se recrean con las columnas nuevas
CREATE OR REPLACE VIEW "ASIENTOS_MANUALES_PRD".CatalogService_ConfigAprobadores AS SELECT
  ConfigAprobador_0.ID,
  ConfigAprobador_0.createdAt,
  ConfigAprobador_0.createdBy,
  ConfigAprobador_0.modifiedAt,
  ConfigAprobador_0.modifiedBy,
  ConfigAprobador_0.empleado_ID,
  ConfigAprobador_0.sector_ID,
  ConfigAprobador_0.cargo_ID,
  ConfigAprobador_0.notificarContabilizacion
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_ConfigAprobador AS ConfigAprobador_0;

CREATE OR REPLACE VIEW "ASIENTOS_MANUALES_PRD".GestionaAsientos_Empleados AS SELECT
  Empleado_0.ID,
  Empleado_0.createdAt,
  Empleado_0.createdBy,
  Empleado_0.modifiedAt,
  Empleado_0.modifiedBy,
  Empleado_0.nombre,
  Empleado_0.email,
  Empleado_0.notificarContabilizacionSolicitante
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_Empleado AS Empleado_0;

CREATE OR REPLACE VIEW "ASIENTOS_MANUALES_PRD".CatalogService_Empleados AS SELECT
  Empleado_0.ID,
  Empleado_0.createdAt,
  Empleado_0.createdBy,
  Empleado_0.modifiedAt,
  Empleado_0.modifiedBy,
  Empleado_0.nombre,
  Empleado_0.email,
  Empleado_0.notificarContabilizacionSolicitante
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_Empleado AS Empleado_0;

CREATE OR REPLACE VIEW "ASIENTOS_MANUALES_PRD".GestionaAsientos_CabeceraAsiento AS SELECT
  CabeceraAsiento_0.ID,
  CabeceraAsiento_0.createdAt,
  CabeceraAsiento_0.createdBy,
  CabeceraAsiento_0.modifiedAt,
  CabeceraAsiento_0.modifiedBy,
  CabeceraAsiento_0.numeroSolicitud,
  CabeceraAsiento_0.periodoAnio,
  CabeceraAsiento_0.periodoMes,
  CabeceraAsiento_0.fechaDocumento,
  CabeceraAsiento_0.fechaContabilizacion,
  CabeceraAsiento_0.claseDocumento,
  CabeceraAsiento_0.moneda,
  CabeceraAsiento_0.tipoCambio,
  CabeceraAsiento_0.textoCabecera,
  CabeceraAsiento_0.sociedad,
  CabeceraAsiento_0.numeroDocumentoSAP,
  CabeceraAsiento_0.idInstanciaWorkflow,
  CabeceraAsiento_0.correo_solicitante,
  CabeceraAsiento_0.estadoSolicitud_ID,
  CabeceraAsiento_0.numeroDocumentoContable,
  CabeceraAsiento_0.CodigoEmpresaContabilizacion,
  CabeceraAsiento_0.AnioFiscalContabilizacion,
  CabeceraAsiento_0.numeroAsiento,
  CabeceraAsiento_0.sectorSolicitante_ID,
  CabeceraAsiento_0.tipoAsiento_ID,
  CabeceraAsiento_0.subtipoAsiento_ID,
  CabeceraAsiento_0.referencia_ID,
  CabeceraAsiento_0.solicitante_ID,
  FALSE AS soloPropias
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_CabeceraAsiento AS CabeceraAsiento_0;

-- PASO 7 — Vistas nuevas (apps de notificaciones)
CREATE VIEW "ASIENTOS_MANUALES_PRD".CatalogService_ConfigNotificaciones AS SELECT
  ConfigAprobador_0.ID,
  ConfigAprobador_0.empleado_ID,
  ConfigAprobador_0.sector_ID,
  ConfigAprobador_0.cargo_ID,
  ConfigAprobador_0.notificarContabilizacion
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_ConfigAprobador AS ConfigAprobador_0;

CREATE VIEW "ASIENTOS_MANUALES_PRD".CatalogService_AvisoSolicitante AS SELECT
  Empleado_0.ID,
  Empleado_0.nombre,
  Empleado_0.notificarContabilizacionSolicitante
FROM "ASIENTOS_MANUALES_PRD".com_carrefour_journal_Empleado AS Empleado_0;

-- PASO 8 — Verificación posterior
-- 8.a Se esperan 4 filas: las 2 columnas nuevas en sus tablas y en los borradores
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, DEFAULT_VALUE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'ASIENTOS_MANUALES_PRD'
  AND COLUMN_NAME IN ('NOTIFICARCONTABILIZACION', 'NOTIFICARCONTABILIZACIONSOLICITANTE')
ORDER BY TABLE_NAME;

-- 8.b Aprobadores: todos en FALSE. Empleados: todos en TRUE. No debe haber NULL.
SELECT notificarContabilizacion, COUNT(*) AS CANTIDAD
FROM "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR
GROUP BY notificarContabilizacion;

SELECT notificarContabilizacionSolicitante, COUNT(*) AS CANTIDAD
FROM "ASIENTOS_MANUALES_PRD".COM_CARREFOUR_JOURNAL_EMPLEADO
GROUP BY notificarContabilizacionSolicitante;

-- 8.c Las vistas responden (sin error)
SELECT TOP 5 * FROM "ASIENTOS_MANUALES_PRD".CatalogService_ConfigNotificaciones;
SELECT TOP 5 * FROM "ASIENTOS_MANUALES_PRD".CatalogService_AvisoSolicitante;
SELECT TOP 5 ID, numeroSolicitud, soloPropias FROM "ASIENTOS_MANUALES_PRD".GestionaAsientos_CabeceraAsiento;
SELECT TOP 5 * FROM "ASIENTOS_MANUALES_PRD".CatalogService_ConfigAprobadores;
SELECT TOP 5 * FROM "ASIENTOS_MANUALES_PRD".CatalogService_Empleados;
SELECT TOP 5 * FROM "ASIENTOS_MANUALES_PRD".GestionaAsientos_Empleados;
